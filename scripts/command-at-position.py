#!/usr/bin/env python3
# Shared machinery: no part of this file is project-owned.
# Read a shell command on stdin. Exit 0 when any argument — a command written
# as its words, like "git commit" — is at command position, and 1 otherwise.
# Print nothing. Quoted text is not a command, except $(...) and backticks,
# which are checked on their own, including inside double quotes. A comment,
# from a # that begins a word to the end of its line, is not a command, and a
# heredoc operator inside one opens no heredoc. A heredoc body is not a command
# unless a shell reads it: bash, sh, zsh, dash, ksh or ssh, by name or by path,
# as the command the heredoc feeds, after its redirections, or later in the
# same pipeline. A command that cannot be parsed, or a heredoc with no closing
# line, counts as a match: the caller cannot tell what would run. A shell
# keyword (then, do, {, !) opens a command position, and a backslash-newline
# joins two lines.

import re
import shlex
import sys

WRAPPERS = {'env', 'npx', 'command', 'exec', 'nohup', 'time', 'sudo'}
SHELLS = {'bash', 'sh', 'zsh', 'dash', 'ksh', 'ssh'}
# Shell keywords after which a command begins: if git commit; then git commit; { git commit; }.
KEYWORDS = {'if', 'then', 'else', 'elif', 'do', 'while', 'until', '!', '{'}
# Between the watched command's words these options take the next token.
CONSUMES_NEXT = {'-C', '-c', '-R', '--repo'}
# shlex with punctuation_chars returns && and || as one token each, and an
# unquoted newline as its own token. ( opens a command position too.
SEPARATORS = {'&&', '||', '|', '&', ';', '\n', '('}
_ASSIGN = re.compile(r'^[A-Za-z_][A-Za-z0-9_]*=')
_HEREDOC = re.compile(
    r"""(?<!<)<<(-?)[ \t]*(?:'([^'\n]*)'|"([^"\n]*)"|([A-Za-z_][A-Za-z0-9_]*))"""
)


def is_assignment(token):
    return _ASSIGN.match(token) is not None


def tokenize(text):
    lexer = shlex.shlex(text, posix=True, punctuation_chars='();<>|&\n')
    lexer.whitespace = ' \t\r\f\v'
    # '#' would swallow the rest of a line. Comments are removed by
    # remove_comments, which knows about quotes; this function stays as it is
    # because branch-in-worktree.sh calls it.
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


_PIPE = {'|', '|&'}
_LINE_SEPARATORS = {'&&', '||', '|', '|&', '&', ';', '(', ')', ';;'}
_REDIRECTIONS = {'>', '>>', '<', '<>', '>&', '<&', '>|', '&>', '&>>', '<<<'}
_MARK = '\x01'


def _is_shell_word(word):
    return word.rsplit('/', 1)[-1] in SHELLS


def _stage_runs_shell(stage):
    """Drop redirections, then ask whether the command word is a shell."""
    kept = []
    index = 0
    while index < len(stage):
        token = stage[index]
        if token in _REDIRECTIONS:
            if kept and kept[-1].isdigit():
                kept.pop()
            index += 2
            continue
        kept.append(token)
        index += 1
    kept = [token for token in kept if token != _MARK]
    start = skip_prefix(kept, 0)
    return start < len(kept) and _is_shell_word(kept[start])


def _shell_reads_heredoc(line, start, end):
    """line holds the heredoc operator at [start:end]. Is a shell its reader?"""
    try:
        tokens = tokenize(line[:start] + ' ' + _MARK + ' ' + line[end:])
    except ValueError:
        # A quote left open on this line, as in "$(cat <<'EOF'. The text around it is
        # checked as commands on its own.
        return False
    stages = [[]]
    joined_by_pipe = [False]
    for token in tokens:
        if token in _LINE_SEPARATORS:
            stages.append([])
            joined_by_pipe.append(token in _PIPE)
        else:
            stages[-1].append(token)
    here = next(i for i, stage in enumerate(stages) if _MARK in stage)
    if _stage_runs_shell(stages[here]):
        return True
    for later in range(here + 1, len(stages)):
        if not joined_by_pipe[later]:
            break
        if _stage_runs_shell(stages[later]):
            return True
    return False


def _comment_start(line):
    """Index of the # that begins a comment on this line, outside quotes, or None."""
    in_single = False
    in_double = False
    index = 0
    while index < len(line):
        char = line[index]
        if in_single:
            in_single = char != "'"
        elif char == '\\':
            index += 1
        elif in_double:
            in_double = char != '"'
        elif char == "'":
            in_single = True
        elif char == '"':
            in_double = True
        elif char == '#' and (index == 0 or line[index - 1] in ' \t;&|('):
            return index
        index += 1
    return None


def strip_heredocs(text):
    """Remove heredoc bodies. Return the text and bodies a shell itself reads.

    Raises ValueError when a heredoc never closes."""
    shells = []
    pieces = []
    cursor = 0
    while True:
        found = _HEREDOC.search(text, cursor)
        if not found:
            pieces.append(text[cursor:])
            break
        line_start = text.rfind('\n', 0, found.start()) + 1
        line_end = text.find('\n', found.end())
        if line_end == -1:
            line_end = len(text)
        comment = _comment_start(text[line_start:line_end])
        if comment is not None and line_start + comment < found.start():
            pieces.append(text[cursor:found.end()])
            cursor = found.end()
            continue
        word = next(group for group in found.groups()[1:] if group is not None)
        body, next_cursor = _heredoc_body(text, found.end(), word, found.group(1) == '-')
        if body is None:
            raise ValueError('heredoc without a closing line')
        # The operator goes too: its body is gone, and a substitution lifted out later
        # would otherwise hold a heredoc with no body.
        pieces.append(text[cursor:found.start()] + ' ')
        if _shell_reads_heredoc(text[line_start:line_end],
                                found.start() - line_start, found.end() - line_start):
            shells.append(body)
        cursor = next_cursor
    return ''.join(pieces), shells


def remove_comments(text):
    """Drop each comment through the end of its line. Quotes and $(...) are tracked."""
    out = []
    stack = []  # 'dq' for a double quote, 'sub' for $( ... ) or a ( inside one
    index = 0
    count = len(text)
    while index < count:
        char = text[index]
        top = stack[-1] if stack else None
        if char == '\\':
            out.append(text[index:index + 2])
            index += 2
            continue
        if top == 'dq':
            if char == '"':
                stack.pop()
            elif text.startswith('$(', index):
                stack.append('sub')
                out.append('$(')
                index += 2
                continue
            out.append(char)
            index += 1
            continue
        if char == "'" or char == '`':
            close = text.find(char, index + 1)
            close = count - 1 if close == -1 else close
            out.append(text[index:close + 1])
            index = close + 1
            continue
        if char == '"':
            stack.append('dq')
        elif text.startswith('$(', index):
            stack.append('sub')
            out.append('$(')
            index += 2
            continue
        elif char == '(' and top == 'sub':
            stack.append('sub')
        elif char == ')' and top == 'sub':
            stack.pop()
        elif char == '#' and (index == 0 or text[index - 1] in ' \t\n;&|('):
            end = text.find('\n', index)
            index = count if end == -1 else end
            continue
        out.append(char)
        index += 1
    return ''.join(out)


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


def is_at_position(text, watched):
    """Raises when the command cannot be parsed; main answers match for that."""
    stripped, shells = strip_heredocs(text)
    reduced, inners = extract_substitutions(remove_comments(stripped))
    if any(is_at_position(inner, watched) for inner in inners):
        return True
    if any(is_at_position(body, watched) for body in shells):
        return True
    words = [command.split() for command in watched]
    # The shell deletes a backslash-newline before it reads a command.
    return at_command_position(tokenize(reduced.replace('\\\n', '')), words)


def main(argv, text):
    watched = argv[1:]
    if not watched:
        return 1
    try:
        found = is_at_position(text, watched)
    except Exception:
        found = True
    return 0 if found else 1


if __name__ == '__main__':
    raise SystemExit(main(sys.argv, sys.stdin.read()))
