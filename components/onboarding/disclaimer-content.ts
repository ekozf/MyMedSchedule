/**
 * The four disclaimer sections. Item texts are the legacy `disclaimer.*` keys, kept verbatim —
 * every item of the old disclaimer screen must stay visible.
 */
import {
  Ban,
  CircleAlert,
  Clock,
  Database,
  FileCheck,
  FileText,
  Lock,
  ShieldCheck,
  Smartphone,
  SquareCheck,
  Stethoscope,
  TriangleAlert,
  User,
  UserRound,
  WifiOff,
  type LucideIcon,
} from 'lucide-react-native';
import type { StatusTone } from '@/lib/theme';

export type DisclaimerSectionKey = 'privacy' | 'medical' | 'responsibility' | 'technical';

export interface DisclaimerSection {
  key: DisclaimerSectionKey;
  icon: LucideIcon;
  tone: Exclude<StatusTone, 'default'>;
  items: { icon: LucideIcon; textKey: string }[];
}

export const DISCLAIMER_SECTIONS: DisclaimerSection[] = [
  {
    key: 'privacy',
    icon: ShieldCheck,
    tone: 'accent',
    items: [
      { icon: Ban, textKey: 'disclaimer.dataPrivacy.noDataCollection' },
      { icon: WifiOff, textKey: 'disclaimer.dataPrivacy.fullyLocal' },
      { icon: Lock, textKey: 'disclaimer.dataPrivacy.secureStorage' },
      { icon: FileText, textKey: 'disclaimer.dataPrivacy.exportUnencrypted' },
      { icon: Database, textKey: 'disclaimer.dataPrivacy.dataLoss' },
    ],
  },
  {
    key: 'medical',
    icon: Stethoscope,
    tone: 'warning',
    items: [
      { icon: Stethoscope, textKey: 'disclaimer.medical.notAdvising' },
      { icon: Ban, textKey: 'disclaimer.medical.noInstructions' },
      { icon: CircleAlert, textKey: 'disclaimer.medical.noInteractionCheck' },
      { icon: Ban, textKey: 'disclaimer.medical.notResponsible' },
      { icon: FileCheck, textKey: 'disclaimer.medical.digitalVersion' },
    ],
  },
  {
    key: 'responsibility',
    icon: UserRound,
    tone: 'success',
    items: [
      { icon: CircleAlert, textKey: 'disclaimer.userResponsibility.inputErrors' },
      { icon: SquareCheck, textKey: 'disclaimer.userResponsibility.yourResponsibility' },
      { icon: User, textKey: 'disclaimer.userResponsibility.yourChoice' },
      { icon: CircleAlert, textKey: 'disclaimer.userResponsibility.reminderTool' },
    ],
  },
  {
    key: 'technical',
    icon: Smartphone,
    tone: 'accent',
    items: [
      { icon: Clock, textKey: 'disclaimer.technical.timeZones' },
      { icon: Smartphone, textKey: 'disclaimer.technical.batteryOptimization' },
      { icon: TriangleAlert, textKey: 'disclaimer.technical.clockChanges' },
    ],
  },
];
