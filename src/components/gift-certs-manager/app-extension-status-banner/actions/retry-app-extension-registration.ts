"use server";

import { updateTag } from "next/cache";
import { getGraphqlApiClient } from "@/lib/bc-api-client/get-graphql-api-client";
import { ActionResult } from "@/lib/actions/action-result";
import { getCredentialsStore } from "@/lib/credentials-store/get-credentials-store";
import { appExtensionStatusTag } from "@/lib/gift-certs-manager/app-extension-status";
import { findOrCreateAppExtension } from "@/lib/gift-certs-manager/register-app-extension";
import { isAuthorizedForStore, NOT_AUTHORIZED_FOR_STORE_MESSAGE } from "@/lib/session/is-authorized-for-store";
import { toSafeMessage } from "@/lib/errors/app-error";
import { logError } from "@/lib/errors/logger";

// User-triggered retry for a failed install-time registration, colocated
// with AppExtensionStatusBanner rather than in lib/. Shares
// findOrCreateAppExtension with registerAppExtension so a retry after a
// partial failure adopts the already-created extension's id instead of
// creating a duplicate. Calls getGraphqlApiClient without an apiToken
// override, since install has already persisted the store's token by the
// time a user can click "Retry."
export async function retryAppExtensionRegistration(storeHash: string | undefined): Promise<ActionResult> {
  if (!(await isAuthorizedForStore(storeHash))) {
    return { success: false, message: NOT_AUTHORIZED_FOR_STORE_MESSAGE };
  }

  // The banner never renders in MOCK/STATIC mode, but satisfy the type
  // either way rather than assuming a caller won't misuse it.
  if (!storeHash) {
    return { success: false, message: "No store to register the App Extension for." };
  }

  try {
    const graphqlApiClient = await getGraphqlApiClient(storeHash);
    const extensionId = await findOrCreateAppExtension(graphqlApiClient);

    await getCredentialsStore().setStoreExtension({ storeHash, extensionId });
  } catch (error) {
    logError(`retryAppExtensionRegistration: store "${storeHash}"`, error);

    return {
      success: false,
      message: toSafeMessage(error, "Failed to register the App Extension."),
    };
  }

  updateTag(appExtensionStatusTag(storeHash));

  return { success: true, message: "App extension registration succeeded" };
}
