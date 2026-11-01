# Test-design lessons that transfer
<!-- layer: framework -->

These are not a standard test-rule set. They are the lessons that survived
extraction: they name no language, platform, or domain, and they fire when
someone is writing a test.

- **Mocking the data a unit receives stops you testing whoever produces it.** Where
  two units agree on a shape and nothing forces them to — a value written by one
  and read back by the other, across a queue, a record, or storage — mock-and-assert
  on each side passes while the pair is broken. Add one test that runs the real
  sequence.

  Both sides can have tests and both can pass: the consumer's test supplied the
  field itself rather than letting the caller write it, so it passed against a
  path that never worked. Caught in review, not by the suite.

- **A path-existence guard must answer about the tree under test.** A helper that
  checks one checkout and falls back to another will report a hit from a directory
  the branch never touched: an isolated worktree rename stays green until merge,
  when the primary checkout finally holds the new layout. A hit counts only when
  its realpath lies inside the checkout that was searched. A link that escapes
  into another tree is not a hit.

  **Precondition:** the project executes plans in isolated worktrees and has a
  helper that looks in more than one checkout — a plan worktree and the primary
  checkout, say. Where nothing looks beyond the tree under test, the fallback cannot
  arise.

- **Assert a shared fake by name, not by call index or total count.** Where several kinds
  of call go through one fake, "called twice" and "the third call was X" break the day a
  new kind of call is added — and they break in tests that have nothing to do with it.
  Filter the recorded calls by name and assert on that list. Counting every call would
  also pass if the code produced two of the one you care about.

- **A fixture reused for a new purpose must be checked for that purpose.** A captured
  input was chosen for one property and carries others nobody looked at. Reused to test
  something else, it can fail in a way the code under test hides — a step that never
  throws, a fallback that renders empty — and the test passes on a fixture that never
  exercised what the test is named after. Before relying on it, assert the property the
  new test depends on.

- **A test filter that matches part of the checkout's path selects everything.** Where
  plans run in worktrees named after the plan, a path pattern taken from the plan's
  subject can match the worktree directory itself, and then every test in it runs. A
  filter that selects everything looks exactly like one that worked. Anchor the pattern
  to the test file, or use a fragment that cannot occur in the checkout's name.

- **Do not assert platform-formatted values exactly.** Dates, `Intl`, currency and
  number formats resolve against the host's locale, so a literal like `'14 Jul'` passes
  for its author and fails on a machine that formats month-first. Assert the wording you
  control and build the expected value with the same formatter. Where a fixed format is
  the product decision, pin the locale in the code, not the test — and never pin it in
  the code only to make a test pass: in one project that changed the date format for
  every user.
- **A precise check that replaces a crude one must still catch what the crude one caught.**
  Before deleting a broad check — a substring match, a catch-all — run the cases it caught
  against its replacement, and add any the replacement misses to its tests. A replacement
  written to its own table of cases passes that table and can still fall silent on shapes
  the old check caught by accident: in one project a tokenizer that replaced a substring
  match missed a command after `then`, `do` or `{`, and one continued from the line
  before, so a hook went quiet on real commits until review probed beyond the table.
- **A deadline in a test stops a hang; it is not something the code must beat.** Where a
  test runs something that polls a fake until the fake's last answer ends it, give that
  run a deadline it cannot reach on any machine, and pass a short one only in a test of
  the deadline itself. A deadline the fake's sequence must beat makes the answer depend
  on how busy the machine is: in this framework two cases that polled a stub three times
  under a three-second deadline exited "still waiting" during busy runs and passed on the
  rerun with nothing changed. Slow every call of the fake in one test, so a deadline
  tightened later is caught.
