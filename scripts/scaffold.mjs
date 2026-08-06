#!/usr/bin/env node
// TODO: entry point for opting a checkout into a specific hosting target's
// deployment tooling (package.json scripts, provider-specific config files,
// a .env.<profile>.example listing what production needs set)
//  - PROFILES = ["vercel"] for now - add a new profile by dropping a
//    scaffold(): Promise<void> export in scripts/<profile>/scaffold.mjs and
//    registering its name here
//  - read the profile name from process.argv[2]; if missing or not in
//    PROFILES, print "Usage: pnpm scaffold <profile>" plus the available
//    profiles and exit(profile ? 1 : 0)
//  - dynamic import(`./${profile}/scaffold.mjs`) and call its scaffold()
//
// Nothing here runs unless a dev explicitly invokes it — the app itself has
// no idea which hosting profile (if any) has been scaffolded, and works the
// same either way (see e.g. get-credentials-store.ts, which only ever reads
// CREDENTIALS_STORE_DRIVER from the environment).
