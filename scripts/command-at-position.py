#!/usr/bin/env python3
# Shared machinery: no part of this file is project-owned.
# Read a shell command on stdin. Exit 0 when any argument — a command written
# as its words, like "git commit" — is at command position, and 1 otherwise.
# Print nothing. Quoted text is not a command, except $(...) and backticks,
# which are checked on their own, including inside double quotes. A heredoc
# body is not a command unless bash, sh, or zsh is what reads it. A command
# that cannot be tokenized matches when a watched command appears in it as a
# substring, once heredoc bodies are removed. A shell keyword (then, do, {, !)
# opens a command position, and a backslash-newline joins two lines.

import re
import shlex
import sys

WRAPPERS = {'env', 'npx', 'command', 'exec', 'nohup', 'time', 'sudo'}
SHELLS = {'bash', 'sh', 'zsh'}
# Shell keywords after which a command begins: if git commit; then git commit; { git commit; }.
KEYWORDS = {'if', 'then', 'else', 'elif', 'do', 'while', 'until', '!', '{'}
# Between the watched command's words these options take the next token.
CONSUMES_NEXT = {'-C', '-c', '-R', '--repo'}
# shlex with punctuation_chars returns && and || as one token each, and an
# unquoted newline as its own token. ( opens a command position too.
SEPARATORS = {'&&', '||', '|', '&', ';', '\n', '('}
_ASSIGN = re.compile(r'^[A-Za-z_][A-Za-z0-9_]*=')
_HEREDOC = re.compile(
    r"""<<(-?)[ \t]*(?:'([^'\n]*)'|"([^"\n]*)"|([A-Za-z_][A-Za-z0-9_]*))"""
)


def is_assignment(token):
    return _ASSIGN.match(token) is not None


def tokenize(text):
    lexer = shlex.shlex(text, posix=True, punctuation_chars='();<>|&\n')
    lexer.whitespace = ' \t\r\f\v'
    # '#' would swallow the rest of a line. A commit message is data, and an
    # untokenizable command falls back to a substring match instead.
    lexer.commenters = ''
    return list(lexer)


def skip_prefix(tokens, index):
    """Keywords, assignments, then wrappers and their options, then assignments again."""
    count = len(tokens)
    while index < count and tokens[index] in KEYWORDS:
        index += 1
    while index < count and is_assignment(tokens[index]):
        index += 1
    while index < count and tokens[index] in WRAPPERS:
        index += 1
        while index < count and tokens[index].startswith('-'):
            # After a wrapper, only -u takes the following token (env -u HOME).
            index += 2 if tokens[index] == '-u' else 1
        while index < count and is_assignment(tokens[index]):
            index += 1
    return index


def words_match(tokens, index, words):
    count = len(tokens)
    for place, word in enumerate(words):
        if place:
            while index < count and tokens[index].startswith('-'):
                index += 2 if tokens[index] in CONSUMES_NEXT else 1
        if index >= count or tokens[index] != word:
            return False
        index += 1
    return True


def at_command_position(tokens, watched):
    count = len(tokens)
    index = 0
    while index < count:
        start = skip_prefix(tokens, index)
        if any(words_match(tokens, start, words) for words in watched):
            return True
        if tokens[index] in SEPARATORS:
            index += 1
            continue
        index += 1
        while index < count and tokens[index] not in SEPARATORS:
            index += 1
        if index < count:
            index += 1
    return False


def _heredoc_body(text, operator_end, word, dash):
    """Body from the line after the operator through the line equal to word."""
    newline = text.find('\n', operator_end)
    if newline == -1:
        return None, operator_end
    cursor = newline + 1
    body = []
    while cursor <= len(text):
        next_newline = text.find('\n', cursor)
        if next_newline == -1:
            line = text[cursor:]
            line_end = len(text)
        else:
            line = text[cursor:next_newline]
            line_end = next_newline + 1
        compared = line.lstrip('\t') if dash else line
        if compared == word:
            return '\n'.join(body), line_end
        body.append(line)
        if next_newline == -1:
            return None, operator_end
        cursor = line_end
    return None, operator_end


def _feeder_is_shell(before):
    start = 0
    for index, char in enumerate(before):
        if char in '\n;|&(':
            start = index + 1
    fragment = before[start:]
    try:
        tokens = [token for token in tokenize(fragment) if token not in {'<', '>', '>>', '<<'}]
    except ValueError:
        return False
    index = skip_prefix(tokens, 0)
    return index < len(tokens) and tokens[index] in SHELLS


def strip_heredocs(text):
    """Remove heredoc bodies. Return the text and bodies a shell itself reads."""
    shells = []
    pieces = []
    cursor = 0
    while True:
        found = _HEREDOC.search(text, cursor)
        if not found:
            pieces.append(text[cursor:])
            break
        word = next(group for group in found.groups()[1:] if group is not None)
        body, next_cursor = _heredoc_body(text, found.end(), word, found.group(1) == '-')
        if body is None:
            pieces.append(text[cursor:found.end()])
            cursor = found.end()
            continue
        pieces.append(text[cursor:found.end()])
        if _feeder_is_shell(text[:found.start()]):
            shells.append(body)
        cursor = next_cursor
    return ''.join(pieces), shells


def _command_substitution(text, start):
    """text[start:] begins with $(. Return the inside and the index after it."""
    index = start + 2
    depth = 1
    in_single = False
    in_double = False
    while index < len(text):
        char = text[index]
        if in_single:
            if char == "'":
                in_single = False
            index += 1
            continue
        if in_double:
            if char == '\\':
                index += 2
                continue
            if char == '"':
                in_double = False
            index += 1
            continue
        if char == "'":
            in_single = True
        elif char == '"':
            in_double = True
        elif char == '(':
            depth += 1
        elif char == ')':
            depth -= 1
            if depth == 0:
                return text[start + 2:index], index + 1
        index += 1
    raise ValueError('unbalanced command substitution')


def _backtick(text, start):
    index = start + 1
    while index < len(text):
        if text[index] == '\\':
            index += 2
            continue
        if text[index] == '`':
            return text[start + 1:index], index + 1
        index += 1
    raise ValueError('unbalanced backtick')


def extract_substitutions(text):
    """Lift $(...) and backticks out, including from inside double quotes."""
    pieces = []
    inners = []
    index = 0
    while index < len(text):
        char = text[index]
        if char == "'":
            close = text.find("'", index + 1)
            if close == -1:
                raise ValueError('unbalanced single quote')
            pieces.append(text[index:close + 1])
            index = close + 1
            continue
        if char == '"':
            pieces.append('"')
            index += 1
            while index < len(text) and text[index] != '"':
                if text[index] == '\\':
                    pieces.append(text[index:index + 2])
                    index += 2
                    continue
                if text.startswith('$(', index):
                    inner, index = _command_substitution(text, index)
                    inners.append(inner)
                    pieces.append(' ')
                    continue
                if text[index] == '`':
                    inner, index = _backtick(text, index)
                    inners.append(inner)
                    pieces.append(' ')
                    continue
                pieces.append(text[index])
                index += 1
            if index >= len(text):
                raise ValueError('unbalanced double quote')
            pieces.append('"')
            index += 1
            continue
        if text.startswith('$(', index):
            inner, index = _command_substitution(text, index)
            inners.append(inner)
            pieces.append(' ')
            continue
        if char == '`':
            inner, index = _backtick(text, index)
            inners.append(inner)
            pieces.append(' ')
            continue
        pieces.append(char)
        index += 1
    return ''.join(pieces), inners


def substring_match(text, watched):
    try:
        stripped, _shells = strip_heredocs(text)
    except Exception:
        stripped = text
    return any(command in stripped for command in watched)


def is_at_position(text, watched):
    try:
        stripped, shells = strip_heredocs(text)
        reduced, inners = extract_substitutions(stripped)
        if any(is_at_position(inner, watched) for inner in inners):
            return True
        if any(is_at_position(body, watched) for body in shells):
            return True
        words = [command.split() for command in watched]
        # The shell deletes a backslash-newline before it reads a command.
        return at_command_position(tokenize(reduced.replace('\\\n', '')), words)
    except Exception:
        return substring_match(text, watched)


def main(argv, text):
    watched = argv[1:]
    if not watched:
        return 1
    try:
        found = is_at_position(text, watched)
    except Exception:
        found = substring_match(text, watched)
    return 0 if found else 1


if __name__ == '__main__':
    raise SystemExit(main(sys.argv, sys.stdin.read()))
