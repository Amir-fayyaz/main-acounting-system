import { Button } from "@/components/shadcn/ui/button/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/shadcn/ui/dialog/dialog";
import { cn } from "@/core/utils/shadcn/utils";
import { X } from "lucide-react";
type ModalSize = "sm" | "md" | "lg" | "xl" | "full";
const sizeClasses: Record<ModalSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-2xl",
  full: "sm:max-w-[95vw] md:max-w-[90vw] lg:max-w-[85vw]",
};

function Modal({
  children,
  title,
  description,
  open,
  onOpenChange,
  trigger,
  showCloseButton = true,
  footer,
  className,
  hideDefaultFooter = false,
  size = "xl",
}: Readonly<{
  trigger?: React.ReactNode;
  description?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  footer?: React.ReactNode;
  className?: string;
  hideDefaultFooter?: boolean;
  size?: ModalSize;
}>) {
  const getSizeClass = () => {
    return sizeClasses[size] || sizeClasses.xl;
  };
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent className={cn(getSizeClass(), className)}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          {children}
          {!hideDefaultFooter && (
            <DialogFooter className="mt-6">
              {footer ? (
                footer
              ) : (
                <>
                  <DialogClose asChild>
                    <Button variant="outline">لغو کردن</Button>
                  </DialogClose>
                  <Button type="submit" form="modal-form">
                    تایید
                  </Button>
                </>
              )}
            </DialogFooter>
          )}
          {showCloseButton && (
            <DialogClose className="absolute left-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
              <span className="sr-only">لغو کردن</span>
              <X size={"15"} />
            </DialogClose>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Modal;
