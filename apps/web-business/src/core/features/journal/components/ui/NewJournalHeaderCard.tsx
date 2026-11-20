import { Card, CardContent, CardHeader, CardTitle, Input } from '@repo/web';
import { toPersianDigits } from '../../utils/journal-formatters';

export interface NewJournalHeaderCardProps {
  date: string;
  entryNumber: string;
  description: string;
  onDateChange: (val: string) => void;
  onDescriptionChange: (val: string) => void;
}

export function NewJournalHeaderCard({
  date,
  entryNumber,
  description,
  onDateChange,
  onDescriptionChange,
}: NewJournalHeaderCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>مشخصات سند</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="journal-date" className="text-sm font-medium">
              تاریخ سند
            </label>
            <Input
              id="journal-date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              placeholder="۱۴۰۵/۰۸/۰۵"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="journal-number" className="text-sm font-medium">
              شماره سند
            </label>
            <Input
              id="journal-number"
              value={toPersianDigits(entryNumber)}
              readOnly
              disabled
              className="bg-muted text-muted-foreground"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="journal-desc" className="text-sm font-medium">
              شرح سند
            </label>
            <Input
              id="journal-desc"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="مثلاً: ثبت هزینه اجاره آبان"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
