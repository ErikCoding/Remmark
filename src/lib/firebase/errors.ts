export function friendlyAuthError(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";

  switch (code) {
    case "auth/invalid-email":
      return "Podaj poprawny adres email.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email lub hasło są nieprawidłowe.";
    case "auth/too-many-requests":
      return "Zbyt wiele prób logowania. Spróbuj ponownie za chwilę.";
    case "auth/network-request-failed":
      return "Nie udało się połączyć. Sprawdź internet i spróbuj ponownie.";
    case "auth/requires-recent-login":
      return "Sesja wygasła. Zaloguj się ponownie.";
    default:
      return "Nie udało się wykonać tej operacji. Spróbuj ponownie.";
  }
}
