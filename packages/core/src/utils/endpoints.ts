/**
 * Collegamenti - Endpoints dell'API Classeviva
 */

export class Collegamenti {
  private static readonly BASE_URL = "https://web.spaggiari.eu/rest/v1";

  // Autenticazione REST
  static readonly AUTH = `${Collegamenti.BASE_URL}/auth/login`;

  // Utente
  static readonly CARD = `${Collegamenti.BASE_URL}/students/{studentId}/card`;

  // Assenze
  static readonly ABSENCES = `${Collegamenti.BASE_URL}/students/{studentId}/absences/details`;
  static readonly ABSENCES_DA = `${Collegamenti.BASE_URL}/students/{studentId}/absences/details/{start}`;
  static readonly ABSENCES_DA_A = `${Collegamenti.BASE_URL}/students/{studentId}/absences/details/{start}/{end}`;

  // Agenda
  static readonly AGENDA = `${Collegamenti.BASE_URL}/students/{studentId}/agenda/all`;
  static readonly AGENDA_DA_A = `${Collegamenti.BASE_URL}/students/{studentId}/agenda/all/{start}/{end}`;

  // Didattica
  static readonly DIDACTICS = `${Collegamenti.BASE_URL}/students/{studentId}/didactics`;
  static readonly DIDACTICS_ITEM = `${Collegamenti.BASE_URL}/students/{studentId}/didactics/item/{folderId}`;

  // Bacheca
  static readonly NOTICEBOARD = `${Collegamenti.BASE_URL}/students/{studentId}/noticeboard`;
  static readonly NOTICEBOARD_READ = `${Collegamenti.BASE_URL}/students/{studentId}/noticeboard/read/{eventCode}/{pubId}/{studentId}`;

  // Voti
  static readonly GRADES = `${Collegamenti.BASE_URL}/students/{studentId}/grades`;

  // Materie
  static readonly SUBJECTS = `${Collegamenti.BASE_URL}/students/{studentId}/subjects`;

  // Periodi
  static readonly PERIODS = `${Collegamenti.BASE_URL}/students/{studentId}/periods`;

  // Note
  static readonly NOTES = `${Collegamenti.BASE_URL}/students/{studentId}/notes/all`;
  static readonly NOTES_READ = `${Collegamenti.BASE_URL}/students/{studentId}/notes/read/{eventCode}/{evtId}`;

  // Lezioni
  static readonly LESSONS = `${Collegamenti.BASE_URL}/students/{studentId}/lessons/today`;
  static readonly LESSONS_DAY = `${Collegamenti.BASE_URL}/students/{studentId}/lessons/{date}`;
  static readonly LESSONS_DA_A = `${Collegamenti.BASE_URL}/students/{studentId}/lessons/{start}/{end}`;
  static readonly LESSONS_DA_A_SUBJECT = `${Collegamenti.BASE_URL}/students/{studentId}/lessons/{start}/{end}/{subjectId}`;

  // Documenti
  static readonly SCHOOLBOOKS = `${Collegamenti.BASE_URL}/students/{studentId}/schoolbooks`;
  static readonly DOCUMENTS = `${Collegamenti.BASE_URL}/students/{studentId}/documents`;
  static readonly DOCUMENTS_CHECK = `${Collegamenti.BASE_URL}/students/{studentId}/documents/check/{hash}`;

  /**
   * Formatta un URL sostituendo i placeholder
   */
  static formatUrl(
    url: string,
    params: Record<string, string | number>,
  ): string {
    let formattedUrl = url;

    for (const [key, value] of Object.entries(params)) {
      formattedUrl = formattedUrl.replace(`{${key}}`, String(value));
    }

    return formattedUrl;
  }

  /** Converte data YYYY-MM-DD in YYYYMMDD per gli endpoint REST */
  private static toRestDate(date: string): string {
    return date.replace(/-/g, "");
  }

  /**
   * Ottiene l'URL per le assenze
   */
  static getAbsencesUrl(
    studentId: string,
    start?: string,
    end?: string,
  ): string {
    if (start && end) {
      return this.formatUrl(this.ABSENCES_DA_A, {
        studentId,
        start: this.toRestDate(start),
        end: this.toRestDate(end),
      });
    } else if (start) {
      return this.formatUrl(this.ABSENCES_DA, {
        studentId,
        start: this.toRestDate(start),
      });
    }
    return this.formatUrl(this.ABSENCES, { studentId });
  }

  /**
   * Ottiene l'URL per l'agenda
   */
  static getAgendaUrl(studentId: string, start?: string, end?: string): string {
    if (start && end) {
      return this.formatUrl(this.AGENDA_DA_A, {
        studentId,
        start: this.toRestDate(start),
        end: this.toRestDate(end),
      });
    }
    return this.formatUrl(this.AGENDA, { studentId });
  }

  /**
   * Ottiene l'URL per le lezioni
   */
  static getLessonsUrl(
    studentId: string,
    date?: string,
    start?: string,
    end?: string,
    subjectId?: number,
  ): string {
    if (start && end && subjectId) {
      return this.formatUrl(this.LESSONS_DA_A_SUBJECT, {
        studentId,
        start: this.toRestDate(start),
        end: this.toRestDate(end),
        subjectId,
      });
    } else if (start && end) {
      return this.formatUrl(this.LESSONS_DA_A, {
        studentId,
        start: this.toRestDate(start),
        end: this.toRestDate(end),
      });
    } else if (date) {
      return this.formatUrl(this.LESSONS_DAY, {
        studentId,
        date: this.toRestDate(date),
      });
    }
    return this.formatUrl(this.LESSONS, { studentId });
  }

  /**
   * Ottiene l'URL per la bacheca
   */
  static getNoticeboardReadUrl(
    studentId: string,
    eventCode: string,
    pubId: number,
  ): string {
    return this.formatUrl(this.NOTICEBOARD_READ, {
      studentId,
      eventCode,
      pubId,
      studentId2: studentId, // L'API ha studentId due volte nell'URL
    }).replace("{studentId}", studentId); // Fix per il secondo placeholder
  }

  /**
   * Ottiene l'URL per leggere una nota
   */
  static getNotesReadUrl(
    studentId: string,
    eventCode: string,
    evtId: number,
  ): string {
    return this.formatUrl(this.NOTES_READ, { studentId, eventCode, evtId });
  }

  /**
   * Ottiene l'URL per un documento
   */
  static getDocumentsCheckUrl(studentId: string, hash: string): string {
    return this.formatUrl(this.DOCUMENTS_CHECK, { studentId, hash });
  }

  /**
   * Ottiene l'URL per un elemento didattico
   */
  static getDidacticsItemUrl(studentId: string, folderId: number): string {
    return this.formatUrl(this.DIDACTICS_ITEM, { studentId, folderId });
  }
}
