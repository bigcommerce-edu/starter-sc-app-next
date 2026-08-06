import { NextResponse } from "next/server";

// TODO: check and return this app's App Extension registration status
//  - real signature: GET(request: NextRequest): Promise<NextResponse>
//  - read storeHash from the request's searchParams
//  - authorize the same way a Server Action would (isAuthorizedForStore) -
//    unlike app/api/app/* (BigCommerce server-to-server callbacks, verified
//    via signed JWT), this route is called from our own frontend
//  - fetchAppExtensionStatus(storeHash), then respond with
//    NextResponse.json(status, { headers: { "Cache-Control": "no-store" } })
//    - the no-store header matters because a GET Route Handler's response
//    is otherwise eligible for the browser's default HTTP caching, a
//    different, browser-level cache from the cacheTag/updateTag machinery
//    in app-extension-status.ts, which only governs the server's own
//    render cache
//  - on any other failure, log it and respond 500 with no body detail -
//    polled by a purely cosmetic client-side banner, so its own catch can
//    treat this the same as any other check failure (hide the banner)
