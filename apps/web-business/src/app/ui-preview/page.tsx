'use client';

import { ArrowLeft, Check, Heart, Search, ShoppingCart, Star } from 'lucide-react';
import { useState } from 'react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch,
  Textarea,
} from '@repo/web/ui';

export default function UIShowcasePage() {
  const [dark, setDark] = useState(false);
  const [selectedSize, setSelectedSize] = useState('medium');
  const [favorite, setFavorite] = useState(false);

  return (
    <main className={`min-h-screen ${dark ? 'dark' : ''} bg-background text-foreground`}>
      <div className="mx-auto max-w-7xl space-y-12 px-5 py-10 sm:px-8">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <Badge className="bg-brand-soft text-ink hover:bg-brand-soft">UI Playground</Badge>

            <p className="max-w-2xl text-muted-foreground">
              بررسی تایپوگرافی، رنگ‌ها، دکمه‌ها، فرم‌ها و کارت‌های پروژه با تم نارنجی و کرم.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border p-3">
            <span className="text-sm">Dark mode</span>
            <Switch checked={dark} onCheckedChange={setDark} />
          </div>
        </header>

        <Separator />

        {/* Brand colors */}
        <section className="space-y-5">
          <SectionTitle title="رنگ‌های برند" description="رنگ‌های اصلی و خنثی طراحی" />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <ColorSwatch color="#ffa00a" name="Brand" hex="#ffa00a" />
            <ColorSwatch color="#ef8f00" name="Brand dark" hex="#ef8f00" />
            <ColorSwatch color="#fff1d9" name="Brand soft" hex="#fff1d9" />
            <ColorSwatch color="#1a120a" name="Ink" hex="#1a120a" />
            <ColorSwatch color="#f4f3e7" name="Sand" hex="#f4f3e7" />
            <ColorSwatch color="#f7f6ee" name="Sand soft" hex="#f7f6ee" />
          </div>
        </section>

        <Separator />

        {/* Typography */}
        <section className="space-y-6">
          <SectionTitle title="Typography" description="سایزها، وزن‌ها و سلسله‌مراتب متن" />

          <Card>
            <CardContent className="space-y-7 pt-6">
              <div>
                <p className="mb-2 text-xs text-muted-foreground">Big / 48px → 128px</p>
                <p className="text-5xl font-bold tracking-tight sm:text-8xl">Design better.</p>
              </div>

              <Separator />

              <div>
                <p className="mb-2 text-xs text-muted-foreground">H1 / 24px → 57px</p>
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-[57px]">
                  Build something great
                </h1>
              </div>

              <div>
                <p className="mb-2 text-xs text-muted-foreground">H2 / 30px</p>
                <h2 className="text-3xl font-semibold tracking-tight">طراحی ساده، تجربه بهتر</h2>
              </div>

              <div>
                <p className="mb-2 text-xs text-muted-foreground">H3 / 24px</p>
                <h3 className="text-2xl font-semibold">عنوان یک بخش</h3>
              </div>

              <div>
                <p className="mb-2 text-xs text-muted-foreground">H4 / 20px</p>
                <h4 className="text-xl font-semibold">عنوان فرعی</h4>
              </div>

              <div className="max-w-2xl space-y-3">
                <p className="text-xs text-muted-foreground">Paragraph / 16px</p>
                <p className="text-base leading-7">
                  طراحی یک محصول خوب فقط به ظاهر زیبا محدود نمی‌شود. فاصله‌گذاری مناسب، خوانایی متن،
                  کنتراست رنگ‌ها و رفتار درست کامپوننت‌ها، تجربه کاربر را بهتر می‌کنند.
                </p>

                <p className="text-lg font-semibold">Large: یک متن برجسته برای نمایش اطلاعات مهم</p>

                <p className="text-sm leading-6 text-muted-foreground">
                  Muted: این متن برای توضیحات فرعی، راهنما و اطلاعات کم‌اهمیت‌تر استفاده می‌شود.
                </p>

                <p className="text-xs text-muted-foreground">
                  Small: آخرین به‌روزرسانی، تاریخ یا توضیحات کوتاه
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Buttons */}
        <section className="space-y-6">
          <SectionTitle title="Buttons" description="انواع ظاهر و اندازه دکمه‌ها" />

          <Card>
            <CardHeader>
              <CardTitle>Variants</CardTitle>
              <CardDescription>هر نوع برای یک کاربرد متفاوت</CardDescription>
            </CardHeader>

            <CardContent className="flex flex-wrap items-center gap-3">
              <Button>دکمه اصلی</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Delete</Button>
              <Button variant="link">Link button</Button>
            </CardContent>

            <Separator />

            <CardHeader>
              <CardTitle>Sizes</CardTitle>
            </CardHeader>

            <CardContent className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" variant="outline" aria-label="علاقه‌مندی">
                <Heart />
              </Button>
            </CardContent>

            <Separator />

            <CardHeader>
              <CardTitle>کاربردهای واقعی</CardTitle>
            </CardHeader>

            <CardContent className="flex flex-wrap gap-3">
              <Button>
                ثبت سفارش
                <ArrowLeft />
              </Button>

              <Button variant="outline">
                <Search />
                جستجو
              </Button>

              <Button variant="outline" onClick={() => setFavorite((value) => !value)}>
                <Heart className={favorite ? 'fill-current text-brand' : ''} />
                {favorite ? 'ذخیره شد' : 'افزودن به علاقه‌مندی'}
              </Button>

              <Button variant="secondary">
                <ShoppingCart />
                افزودن به سبد خرید
              </Button>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Inputs */}
        <section className="space-y-6">
          <SectionTitle
            title="Inputs & Forms"
            description="ورودی‌ها در اندازه‌ها و حالت‌های مختلف"
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Input sizes</CardTitle>
                <CardDescription>ارتفاع و فاصله داخلی ورودی‌ها</CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Small · 32px</label>
                  <Input className="h-8" placeholder="جستجو..." />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Default · 36px</label>
                  <Input placeholder="نام خود را وارد کنید" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Large · 44px</label>
                  <Input className="h-11" placeholder="ایمیل شما" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">با آیکون</label>
                  <div className="relative">
                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" placeholder="جستجوی محصولات..." />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">غیرفعال</label>
                  <Input disabled placeholder="این فیلد غیرفعال است" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>فرم نمونه</CardTitle>
                <CardDescription>ترکیب ورودی، انتخابگر و توضیحات</CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium">نام محصول</label>
                  <Input placeholder="مثلاً لپ‌تاپ" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">دسته‌بندی</label>
                  <Select value={selectedSize} onValueChange={setSelectedSize}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="انتخاب دسته‌بندی" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">کوچک</SelectItem>
                      <SelectItem value="medium">متوسط</SelectItem>
                      <SelectItem value="large">بزرگ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">توضیحات</label>
                  <Textarea
                    placeholder="توضیحات محصول را بنویسید..."
                    className="min-h-28 resize-y"
                  />
                </div>

                <Button className="w-full">
                  <Check />
                  ثبت اطلاعات
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator />

        {/* Badges */}
        <section className="space-y-6">
          <SectionTitle title="Badges" description="نشان وضعیت، دسته‌بندی و برچسب" />

          <Card>
            <CardContent className="flex flex-wrap items-center gap-3 pt-6">
              <Badge>پیش‌فرض</Badge>
              <Badge className="bg-brand-soft text-ink hover:bg-brand-soft">پیشنهاد ویژه</Badge>
              <Badge variant="secondary">جدید</Badge>
              <Badge variant="outline">در انتظار</Badge>
              <Badge variant="destructive">ناموفق</Badge>
              <Badge className="gap-1 bg-brand text-ink hover:bg-brand-dark">
                <Star className="size-3" />
                پرفروش
              </Badge>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Cards */}
        <section className="space-y-6">
          <SectionTitle title="Cards" description="کارت ساده، کارت محصول و کارت اطلاعات" />

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <Badge className="w-fit bg-brand-soft text-ink hover:bg-brand-soft">ساده</Badge>
                <CardTitle>کارت پایه</CardTitle>
                <CardDescription>برای نمایش اطلاعات دسته‌بندی‌شده</CardDescription>
              </CardHeader>

              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">
                  اینجا می‌توانی توضیح، آمار یا اطلاعات یک بخش را قرار بدهی.
                </p>
              </CardContent>

              <CardFooter>
                <Button variant="outline" className="w-full">
                  مشاهده جزئیات
                </Button>
              </CardFooter>
            </Card>

            <Card className="overflow-hidden border-brand/30">
              <div className="flex h-36 items-center justify-center bg-brand-soft">
                <ShoppingCart className="size-14 text-ink" />
              </div>

              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>محصول نمونه</CardTitle>
                  <Badge>ویژه</Badge>
                </div>
                <CardDescription>کارت مناسب فروشگاه آنلاین</CardDescription>
              </CardHeader>

              <CardContent>
                <p className="text-2xl font-bold">۲,۵۰۰,۰۰۰ تومان</p>
                <p className="mt-2 text-sm text-muted-foreground">ارسال سریع و ضمانت اصالت کالا</p>
              </CardContent>

              <CardFooter className="gap-2">
                <Button className="flex-1">افزودن به سبد</Button>
                <Button variant="outline" size="icon" aria-label="افزودن به علاقه‌مندی">
                  <Heart />
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex size-12 items-center justify-center rounded-xl bg-brand-soft text-ink">
                  <Star className="size-6" />
                </div>
                <CardTitle>کارت آماری</CardTitle>
                <CardDescription>مناسب داشبورد مدیریت</CardDescription>
              </CardHeader>

              <CardContent>
                <p className="text-4xl font-extrabold">۱۲۸</p>
                <p className="mt-2 text-sm text-muted-foreground">سفارش ثبت‌شده در این ماه</p>
              </CardContent>

              <CardFooter>
                <Badge variant="secondary">+۱۲٪ نسبت به ماه قبل</Badge>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t pt-6 text-center text-sm text-muted-foreground">
          UI Playground · Brand colors #ffa00a and #ef8f00
        </footer>
      </div>
    </main>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function ColorSwatch({ color, name, hex }: { color: string; name: string; hex: string }) {
  return (
    <div className="space-y-2">
      <div className="h-24 rounded-xl border shadow-sm" style={{ backgroundColor: color }} />
      <div>
        <p className="text-sm font-semibold">{name}</p>
        <p className="text-xs text-muted-foreground">{hex}</p>
      </div>
    </div>
  );
}
