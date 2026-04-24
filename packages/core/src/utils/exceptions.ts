/**
 * Custom Exceptions per Classeviva
 */

/**
 * Errore base per Classeviva
 */
export class ClassevivaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClassevivaError";
    Object.setPrototypeOf(this, ClassevivaError.prototype);
  }
}

/**
 * Errore HTTP generico
 */
export class ErroreHTTP extends ClassevivaError {
  public statusCode: number;

  constructor(statusCode: number, message: string) {
    super(`HTTP ${statusCode}: ${message}`);
    this.name = "ErroreHTTP";
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, ErroreHTTP.prototype);
  }
}

/**
 * Errore 404 - Risorsa non trovata
 */
export class ErroreHTTP404 extends ErroreHTTP {
  constructor(message: string = "Risorsa non trovata") {
    super(404, message);
    this.name = "ErroreHTTP404";
    Object.setPrototypeOf(this, ErroreHTTP404.prototype);
  }
}

/**
 * Errore relativo al token di autenticazione
 */
export class TokenErrore extends ClassevivaError {
  constructor(message: string) {
    super(message);
    this.name = "TokenErrore";
    Object.setPrototypeOf(this, TokenErrore.prototype);
  }
}

/**
 * Token non presente
 */
export class TokenNonPresente extends TokenErrore {
  constructor(message: string = "Token non presente") {
    super(message);
    this.name = "TokenNonPresente";
    Object.setPrototypeOf(this, TokenNonPresente.prototype);
  }
}

/**
 * Token non valido
 */
export class TokenNonValido extends TokenErrore {
  constructor(message: string = "Token non valido") {
    super(message);
    this.name = "TokenNonValido";
    Object.setPrototypeOf(this, TokenNonValido.prototype);
  }
}

/**
 * Token scaduto
 */
export class TokenScaduto extends TokenErrore {
  constructor(message: string = "Token scaduto") {
    super(message);
    this.name = "TokenScaduto";
    Object.setPrototypeOf(this, TokenScaduto.prototype);
  }
}

/**
 * Password non valida
 */
export class PasswordNonValida extends ClassevivaError {
  constructor(message: string = "Password non valida") {
    super(message);
    this.name = "PasswordNonValida";
    Object.setPrototypeOf(this, PasswordNonValida.prototype);
  }
}

/**
 * Errore relativo alle date
 */
export class DataErrore extends ClassevivaError {
  constructor(message: string) {
    super(message);
    this.name = "DataErrore";
    Object.setPrototypeOf(this, DataErrore.prototype);
  }
}

/**
 * Data fuori dal range consentito
 */
export class DataFuoriGamma extends DataErrore {
  constructor(message: string = "Data fuori dal range consentito") {
    super(message);
    this.name = "DataFuoriGamma";
    Object.setPrototypeOf(this, DataFuoriGamma.prototype);
  }
}

/**
 * Formato data non valido
 */
export class FormatoNonValido extends DataErrore {
  constructor(message: string = "Formato data non valido") {
    super(message);
    this.name = "FormatoNonValido";
    Object.setPrototypeOf(this, FormatoNonValido.prototype);
  }
}

/**
 * Utente non ha effettuato l'accesso
 */
export class NonAccesso extends ClassevivaError {
  constructor(message: string = "Utente non ha effettuato l'accesso") {
    super(message);
    this.name = "NonAccesso";
    Object.setPrototypeOf(this, NonAccesso.prototype);
  }
}

/**
 * Nessun dato disponibile
 */
export class SenzaDati extends ClassevivaError {
  constructor(message: string = "Nessun dato disponibile") {
    super(message);
    this.name = "SenzaDati";
    Object.setPrototypeOf(this, SenzaDati.prototype);
  }
}

/**
 * Parametro non valido
 */
export class ParametroNonValido extends ClassevivaError {
  constructor(message: string) {
    super(message);
    this.name = "ParametroNonValido";
    Object.setPrototypeOf(this, ParametroNonValido.prototype);
  }
}

/**
 * Valore non valido
 */
export class ValoreNonValido extends ClassevivaError {
  constructor(message: string) {
    super(message);
    this.name = "ValoreNonValido";
    Object.setPrototypeOf(this, ValoreNonValido.prototype);
  }
}

/**
 * Categoria non presente
 */
export class CategoriaNonPresente extends ClassevivaError {
  constructor(message: string = "Categoria non presente") {
    super(message);
    this.name = "CategoriaNonPresente";
    Object.setPrototypeOf(this, CategoriaNonPresente.prototype);
  }
}

/**
 * Errore generico utente
 */
export class UtenteErrore extends ClassevivaError {
  constructor(message: string) {
    super(message);
    this.name = "UtenteErrore";
    Object.setPrototypeOf(this, UtenteErrore.prototype);
  }
}

/**
 * Solleva un errore HTTP appropriato in base allo status code
 */
export function sollevaErroreHTTP(statusCode: number, message?: string): never {
  const defaultMessage = message || `Errore HTTP ${statusCode}`;

  switch (statusCode) {
    case 400:
      throw new ErroreHTTP(statusCode, message || "Richiesta non valida");
    case 401:
      throw new TokenNonValido("Token non valido o scaduto");
    case 403:
      throw new ErroreHTTP(statusCode, message || "Accesso negato");
    case 404:
      throw new ErroreHTTP404(message || "Risorsa non trovata");
    case 422:
      throw new PasswordNonValida();
    case 500:
      throw new ErroreHTTP(statusCode, message || "Errore interno del server");
    case 503:
      throw new ErroreHTTP(statusCode, message || "Servizio non disponibile");
    default:
      throw new ErroreHTTP(statusCode, defaultMessage);
  }
}
