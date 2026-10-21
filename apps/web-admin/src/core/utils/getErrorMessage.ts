export function getErrorMessage(error: any): string {
  if (!error) return "خطای ناشناخته";

  try {
    if (
      error?.errors &&
      Array.isArray(error.errors) &&
      error.errors.length > 0
    ) {
      const firstError = error.errors[0];

      if (firstError?.extensions?.response?.body?.message) {
        return firstError.extensions.response.body.message;
      }

      if (firstError?.extensions?.response?.body?.errors?.[0]) {
        return firstError.extensions.response.body.errors[0];
      }

      if (
        firstError?.message &&
        !firstError.message.includes("Upstream HTTP Error")
      ) {
        return firstError.message;
      }
    }

    if (
      error?.graphQLErrors &&
      Array.isArray(error.graphQLErrors) &&
      error.graphQLErrors.length > 0
    ) {
      const firstError = error.graphQLErrors[0];

      if (firstError?.extensions?.response?.body?.message) {
        return firstError.extensions.response.body.message;
      }

      if (firstError?.extensions?.response?.body?.errors?.[0]) {
        return firstError.extensions.response.body.errors[0];
      }

      if (
        firstError?.message &&
        !firstError.message.includes("Upstream HTTP Error")
      ) {
        return firstError.message;
      }
    }

    if (
      error?.message &&
      typeof error.message === "string" &&
      !error.message.includes("Upstream HTTP Error")
    ) {
      return error.message;
    }

    return "خطا در ارتباط با سرور";
  } catch (e) {
    console.error("Error in getErrorMessage:", e);
    return "خطا در پردازش خطا";
  }
}
