import { Button } from './Button';

interface CtaBandProps {
  title: string;
  body: string;
  buttonLabel: string;
  onClick: () => void;
}

export function CtaBand({ title, body, buttonLabel, onClick }: CtaBandProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] bg-deep-lake p-[18px] md:flex-row md:items-center md:justify-between md:gap-6 md:rounded-[16px] md:px-10 md:py-8">
      <div className="flex flex-col gap-1.5">
        <div className="font-display text-sm text-chalk md:text-xl md:font-medium">{title}</div>
        <div className="hidden font-body text-sm text-alpine-sky md:block">{body}</div>
      </div>
      <Button onClick={onClick}>{buttonLabel}</Button>
    </div>
  );
}
