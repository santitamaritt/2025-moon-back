export interface IEmailService {
  sendPasswordRecovery(url: string, to: string): Promise<void>;
  sendNotification(to: string, subject: string, html: string): Promise<void>;
}

export const IEmailServiceToken = 'IEmailService';
