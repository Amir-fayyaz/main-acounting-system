type GqlErrorItem = {
  message?: string;
  extensions?: {
    response?: {
      body?: {
        message?: string;
        errors?: string[];
      };
    };
  };
};

type ErrorLike = {
  errors?: GqlErrorItem[];
  graphQLErrors?: GqlErrorItem[];
  message?: string;
};

export function getErrorMessage(
  error: ErrorLike | string | null | undefined,
): string {
  if (
    !error ||
    (typeof error === "string" && !error.trim())
  ) {
    return "خطای ناشناخته";
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    const errorLists = [error.errors, error.graphQLErrors];

    for (const errors of errorLists) {
      if (!Array.isArray(errors) || errors.length === 0) {
        continue;
      }

      const firstError = errors[0];

      if (!firstError) {
        continue;
      }

      const responseBody = firstError.extensions?.response?.body;

      if (responseBody?.message) {
        return responseBody.message;
      }

      if (responseBody?.errors?.[0]) {
        return responseBody.errors[0];
      }

      if (
        firstError.message &&
        !firstError.message.includes("Upstream HTTP Error")
      ) {
        return firstError.message;
      }
    }

    if (
      error.message &&
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
