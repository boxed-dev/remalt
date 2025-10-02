# Reusable Typography Classes

This document lists all the reusable CSS classes available in `src/app/globals.css` for consistent typography across the application.

## Responsive Headings

### `.hero-text`
- **Mobile**: 48px / 48px line-height / -2px letter-spacing
- **Desktop (768px+)**: 84px / 84px line-height / -3.5px letter-spacing
- **Font**: Geist, semibold
- **Color**: Black (#000000)
- **Usage**: Main hero section headings

### `.section-heading`
- **Mobile**: 32px / 36px line-height / -1.28px letter-spacing
- **Desktop (768px+)**: 55px / 55px line-height / -2.2px letter-spacing
- **Font**: Geist, semibold
- **Color**: Black (#000000)
- **Usage**: Section headings throughout the site

## Body Text

### `.paragraph-text`
- **Mobile**: 16px / 22px line-height / -0.16px letter-spacing
- **Desktop (768px+)**: 18px / 25.2px line-height / -0.18px letter-spacing
- **Font**: Inter, medium
- **Color**: Gray (#757575)
- **Usage**: Main paragraph text

### `.badge-text`
- **Size**: 12px / 14.4px line-height / -0.12px letter-spacing
- **Font**: Inter, regular
- **Usage**: Badge labels

## Card Typography

### `.card-title`
- **Size**: 16px / 22px line-height / -0.16px letter-spacing
- **Font**: Inter, medium
- **Color**: Black (#000000)
- **Usage**: Card headings

### `.card-text`
- **Size**: 14px / 20px line-height / -0.14px letter-spacing
- **Font**: Inter, medium
- **Color**: Black (#000000)
- **Usage**: Card body text

### `.card-subtext`
- **Size**: 13px / 19px line-height / -0.13px letter-spacing
- **Font**: Inter, medium
- **Color**: Gray (#5c5f62)
- **Usage**: Card secondary text (dates, times, etc.)

## Feature Cards

### `.feature-text`
- **Mobile**: 14px / 1.3 line-height / -0.14px letter-spacing
- **Tablet (640px+)**: 16px / 1.3 line-height / -0.16px letter-spacing
- **Desktop (1024px+)**: 18px / 1.3 line-height / -0.18px letter-spacing
- **Font**: Inter, medium
- **Color**: Dark gray (#1a1a1a)
- **Usage**: Feature card titles

## Testimonials

### `.testimonial-text`
- **Mobile**: 14px / 1.6 line-height
- **Tablet (640px+)**: 16px / 1.6 line-height
- **Font**: Inter, regular
- **Color**: Black (#000000)
- **Usage**: Testimonial quotes and citations

## Buttons

### `.button-text`
- **Size**: 14px / 16.8px line-height / 0 letter-spacing
- **Font**: Inter, regular
- **Usage**: Button labels

## Brand Colors

### Text Colors
- `.text-brand-green` - #12785a
- `.text-brand-gold` - #d4af7f

### Background Colors
- `.bg-brand-green` - #12785a
- `.bg-brand-gold` - #d4af7f

### Gradients
- `.bg-brand-gradient` - Linear gradient (white → green → gold)
- `.text-brand-gradient` - Text with gradient fill

## Usage Example

```tsx
// Before
<h2 className="[font-family:'Geist',Helvetica] font-semibold text-black text-[55px] tracking-[-2.20px] leading-[55px]">
  My Heading
</h2>

// After
<h2 className="section-heading">
  My Heading
</h2>
```

## Benefits

1. **Consistency**: All text uses the same styles across the app
2. **Responsive**: Automatically adjusts for mobile (32px) and desktop (55px)
3. **Maintainable**: Change once in globals.css, updates everywhere
4. **Cleaner Code**: Shorter, more readable class names
5. **Performance**: Reusable classes reduce CSS bundle size
