'use client'

import { IconCircleCheck, IconSelector } from '@tabler/icons-react'
import * as React from 'react'
import RPNInput, {
  type Country,
  type FlagProps,
  getCountryCallingCode,
  type Props,
  type Value
} from 'react-phone-number-input'
import flags from 'react-phone-number-input/flags'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

type PhoneInputProps = Omit<React.ComponentProps<'input'>, 'onChange' | 'value' | 'ref'> &
  Omit<Props<typeof RPNInput>, 'onChange'> & {
    onChange?: (value: Value) => void
  }

const PhoneInput: React.ForwardRefExoticComponent<PhoneInputProps> = React.forwardRef<
  React.ComponentRef<typeof RPNInput>,
  PhoneInputProps
>(({ className, onChange, value, ...props }, ref) => {
  return (
    <RPNInput
      ref={ref}
      className={cn('flex', className)}
      flagComponent={FlagComponent}
      countrySelectComponent={CountrySelect}
      inputComponent={InputComponent}
      smartCaret={false}
      value={value ?? undefined}
      /**
       * Handles the onChange event.
       *
       * react-phone-number-input might trigger the onChange event as undefined
       * when a valid phone number is not entered. To prevent this,
       * the value is coerced to an empty string.
       *
       * @param {E164Number | undefined} value - The entered value
       */
      onChange={value => onChange?.(value ?? ('' as Value))}
      {...props}
    />
  )
})
PhoneInput.displayName = 'PhoneInput'

const InputComponent = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, ...props }, ref) => (
    <Input className={cn('rounded-s-none rounded-e-md', className)} {...props} ref={ref} />
  )
)
InputComponent.displayName = 'InputComponent'

type CountryEntry = { label: string; value: Country | undefined }

type CountrySelectProps = {
  disabled?: boolean
  value: Country
  options: CountryEntry[]
  onChange: (country: Country) => void
}

const CountrySelect = ({ disabled, onChange, options: countryList, value: selectedCountry }: CountrySelectProps) => {
  const scrollAreaRef = React.useRef<HTMLDivElement>(null)
  const [searchValue, setSearchValue] = React.useState('')
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal>
      <PopoverTrigger>
        <Button
          type='button'
          variant='outline'
          className='flex gap-1 rounded-s-md rounded-e-none border-r-0 px-3 focus:z-10'
          disabled={disabled}
        >
          <FlagComponent country={selectedCountry} countryName={selectedCountry} />
          <IconSelector className={cn('-mr-2 size-4 opacity-50', disabled ? 'hidden' : 'opacity-100')} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-75 p-0'>
        <Command>
          <CommandInput
            value={searchValue}
            onValueChange={value => {
              setSearchValue(value)
              setTimeout(() => {
                if (scrollAreaRef.current) {
                  const viewportElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
                  if (viewportElement) {
                    viewportElement.scrollTop = 0
                  }
                }
              }, 0)
            }}
            placeholder='Search country...'
          />
          <CommandList>
            <ScrollArea ref={scrollAreaRef} className='h-72'>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {countryList.map(({ label, value }) =>
                  value ? (
                    <CountrySelectOption
                      key={value}
                      country={value}
                      countryName={label}
                      selectedCountry={selectedCountry}
                      onChange={onChange}
                      onSelectComplete={() => {
                        setIsOpen(false)
                      }}
                    />
                  ) : null
                )}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

type CountrySelectOptionProps = {
  selectedCountry: Country
  onChange: (country: Country) => void
  onSelectComplete: () => void
} & FlagProps

const CountrySelectOption = ({
  country,
  countryName,
  onChange,
  onSelectComplete,
  selectedCountry
}: CountrySelectOptionProps) => {
  const handleSelect = () => {
    onChange(country)
    onSelectComplete()
  }

  return (
    <CommandItem className='gap-2' onSelect={handleSelect}>
      <FlagComponent country={country} countryName={countryName} />
      <span className='flex-1 text-sm'>{countryName}</span>
      <span className='text-foreground/50 text-sm'>{`+${getCountryCallingCode(country)}`}</span>
      <IconCircleCheck className={`ml-auto size-4 ${country === selectedCountry ? 'opacity-100' : 'opacity-0'}`} />
    </CommandItem>
  )
}

const FlagComponent = ({ country, countryName }: FlagProps) => {
  const Flag = flags[country]

  return (
    <span className="flex h-4 w-6 overflow-hidden rounded-sm bg-foreground/20 [&_svg:not([class*='size-'])]:size-full">
      {!!Flag && <Flag title={countryName} />}
    </span>
  )
}

export default PhoneInput
