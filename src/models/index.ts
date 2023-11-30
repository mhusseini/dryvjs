export interface PersonalData {
    anrede: string;
    vorname: string;
    nachname: string;
    geburtsdatum: string;
    emailAdresse: string;
    telefonNummer: string;
    werberVertragsnummer: string;
    child: PersonalData;
}