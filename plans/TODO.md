# TODO

Bash CLI wrapping clasp for Apps Script.

## In progress

## Backlog

## Done

- Implement direct Apps Script API calls via clasp credentials
  (plans/api-calls.md) (plan: [api-calls.md](plans/api-calls.md))

- Clean up common.sh. I'm pretty sure it's not used any more and is just a
  remnant of the old bash implementation.

- Research what it would mean to set `hug` up like `clasp` in terms of
  authentication. As I understand it, `clasp` runs in a predefined `GCP` project
  and each user is, I guess, authorizing it to do it's thing with their
  resources. So can `hug` do the same thing and maybe get it's own permissions
  to do things `clasp` can't do? Or are there a set of things that can only be
  done if the `hug` user sets up their own GCP project?

