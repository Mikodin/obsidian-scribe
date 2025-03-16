export enum RECORDING_STATUS {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PAUSED = 'PAUSED',
}

export enum LanguageOptions {
  auto = 'auto',
  en = 'en',
  es = 'es',
  fr = 'fr',
  de = 'de',
  it = 'it',
  pt = 'pt',
  nl = 'nl',
  hi = 'hi',
  ja = 'ja',
  zh = 'zh',
  fi = 'fi',
  ko = 'ko',
  pl = 'pl',
  ru = 'ru',
  tr = 'tr',
  uk = 'uk',
  vi = 'vi',
}

export type OutputLanguageOptions = Exclude<LanguageOptions, 'auto'>;

export const LanguageDisplayNames: { [key in LanguageOptions]: string } = {
  [LanguageOptions.auto]: 'Auto Detect',
  [LanguageOptions.en]: 'English',
  [LanguageOptions.es]: 'Spanish',
  [LanguageOptions.fr]: 'French',
  [LanguageOptions.de]: 'German',
  [LanguageOptions.it]: 'Italian',
  [LanguageOptions.pt]: 'Portuguese',
  [LanguageOptions.nl]: 'Dutch',
  [LanguageOptions.hi]: 'Hindi',
  [LanguageOptions.ja]: 'Japanese',
  [LanguageOptions.zh]: 'Chinese',
  [LanguageOptions.fi]: 'Finnish',
  [LanguageOptions.ko]: 'Korean',
  [LanguageOptions.pl]: 'Polish',
  [LanguageOptions.ru]: 'Russian',
  [LanguageOptions.tr]: 'Turkish',
  [LanguageOptions.uk]: 'Ukrainian',
  [LanguageOptions.vi]: 'Vietnamese',
};
