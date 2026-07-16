"use server";

import { updateTag } from "next/cache";
import { getGraphqlApiClient } from "@/lib/bc-api-client/get-graphql-api-client";
import { ActionResult } from "@/lib/actions/action-result";
import { getCredentialsStore } from "@/lib/credentials-store/get-credentials-store";
import { APP_EXTENSION_INPUT, CREATE_APP_EXTENSION_MUTATION, CreateAppExtensionResult } from "@/lib/gift-certs-manager/app-extension-mutation";
import { appExtensionStatusTag } from "@/lib/gift-certs-manager/app-extension-status";
import { isAuthorizedForStore } from "@/lib/session/is-authorized-for-store";

// User-triggered retry for a failed install-time registration — called only
// from AppExtensionStatusBanner's "Retry" action, so this action is
// colocated with that component rather than in lib/. Unlike
// registerAppExtension (called only from the /auth route, which swallows
// failures so a bad registration never blocks install), this surfaces
// success/failure as an ActionResult so the banner can show what happened.
// Calls getGraphqlApiClient without an apiToken override — by the time a
// user can click "Retry," install has already completed and persisted the
// store's token, so the normal storage-backed lookup (see
// resolveApiToken) is exactly what's needed; there's no handshake token to
// thread through here the way registerAppExtension needs at install time.
export async function retryAppExtensionRegistration(storeHash: string | undefined): Promise<ActionResult> {
  if (!(await isAuthorizedForStore(storeHash))) {
    throw new Error("Not authorized for this store.");
  }

  // isAuthorizedForStore only passes with storeHash undefined in MOCK/STATIC
  // mode (see its own doc comment) — this action has no reason to ever be
  // called in those modes (the banner never renders there), but satisfy the
  // type either way rather than assuming a caller won't misuse it.
  if (!storeHash) {
    return { success: false, message: "No store to register the App Extension for." };
  }

  try {
    const graphqlApiClient = await getGraphqlApiClient(storeHash);

    const result = await graphqlApiClient.request<CreateAppExtensionResult>(CREATE_APP_EXTENSION_MUTATION, {
      input: APP_EXTENSION_INPUT,
    });

    const extensionId = result.appExtension.createAppExtension.appExtension.id;

    await getCredentialsStore().setStoreExtension({ storeHash, extensionId });
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to register the App Extension.",
    };
  }

  updateTag(appExtensionStatusTag(storeHash));

  return { success: true, message: "App Extension registered." };
}
