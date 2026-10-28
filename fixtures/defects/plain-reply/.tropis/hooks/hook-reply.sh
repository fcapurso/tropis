#!/usr/bin/env bash
# Planted defect: the reply helper does nothing, so every hook that sources it prints
# plain text — which no agent hears. rule-delivery must go red.
reply_context() { printf '%s\n' "$1"; }
reply_on_exit() { :; }
