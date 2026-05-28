export class ClassevivaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClassevivaError";
    Object.setPrototypeOf(this, ClassevivaError.prototype);
  }
}

export class ErroreHTTP extends ClassevivaError {
  public statusCode: number;
  constructor(statusCode: number, message: string) {
    super(`HTTP ${statusCode}: ${message}`);
    this.name = "ErroreHTTP";
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, ErroreHTTP.prototype);
  }
}

export class NonAccesso extends ClassevivaError {
  constructor(message = "Utente non connesso. Effettuare il login prima.") {
    super(message);
    this.name = "NonAccesso";
    Object.setPrototypeOf(this, NonAccesso.prototype);
  }
}

export class PasswordNonValida extends ClassevivaError {
  constructor(message = "Password non fornita o non valida.") {
    super(message);
    this.name = "PasswordNonValida";
    Object.setPrototypeOf(this, PasswordNonValida.prototype);
  }
}

export class FormatoNonValido extends ClassevivaError {
  constructor(message: string) {
    super(message);
    this.name = "FormatoNonValido";
    Object.setPrototypeOf(this, FormatoNonValido.prototype);
  }
}

export class DataFuoriGamma extends ClassevivaError {
  constructor(message: string) {
    super(message);
    this.name = "DataFuoriGamma";
    Object.setPrototypeOf(this, DataFuoriGamma.prototype);
  }
}

export class UtenteErrore extends ClassevivaError {
  constructor(message: string) {
    super(message);
    this.name = "UtenteErrore";
    Object.setPrototypeOf(this, UtenteErrore.prototype);
  }
}

export function sollevaErroreHTTP(statusCode: number, message: string): never {
  if (statusCode === 401) throw new NonAccesso(message);
  throw new ErroreHTTP(statusCode, message);
}
