'use client'

import { IconEye, IconEyeOff, IconStack2 } from '@tabler/icons-react'
import { revalidateLogic, useForm } from '@tanstack/react-form'
import Link from 'next/link'
import * as React from 'react'
import { toast } from 'sonner'

import Apple from '@/assets/svg/logos/Apple'
import Google from '@/assets/svg/logos/Google'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { authClient } from '@/lib/auth-client'
import { SignInSchema } from '@/schemas'

export function SignInForm() {
  const [isVisible, setIsVisible] = React.useState(false)

  const handleGoogleSignIn = async () => {
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/portal'
    })
  }

  const form = useForm({
    defaultValues: {
      email: '',
      password: ''
    },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: SignInSchema
    },
    onSubmit: async ({ value }) => {
      const { data: responseData, error: responseError } = await authClient.signIn.email({
        email: value.email,
        password: value.password,
        callbackURL: '/portal'
      })
      if (responseError) {
        toast.error(responseError.message ?? 'An unknown error occurred.')
      } else if (responseData) {
        toast.success('Sign In Successful!')
      }
    }
  })

  return (
    <div className='flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10'>
      <div className='flex w-full max-w-sm flex-col gap-6'>
        <Link href='/' className='flex items-center gap-2 self-center font-medium'>
          <div className='flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground'>
            <IconStack2 className='size-4' />
          </div>
          {process.env.NEXT_PUBLIC_APP_NAME}
        </Link>

        <Card>
          <CardHeader className='text-center'>
            <CardTitle className='text-xl'>Welcome Back</CardTitle>
            <CardDescription>Sign In with your Social Account</CardDescription>
          </CardHeader>

          <CardContent className='overflow-visible! flex h-auto! flex-col px-6'>
            {/* OAuth buttons */}
            <div className='flex flex-col gap-4'>
              <Button variant='outline' className='w-full' aria-label='Login with Apple'>
                <Apple />
                Sign In with Apple
              </Button>

              <Button
                variant='outline'
                className='w-full'
                aria-label='Login with Google'
                onClick={handleGoogleSignIn}
                type='button'
              >
                <Google />
                Sign In with Google
              </Button>
            </div>

            {/* Divider */}
            <div className='relative py-3 text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-border after:border-t'>
              <span className='relative z-10 bg-card px-2 text-muted-foreground'>Or continue with</span>
            </div>

            <form
              id='signin'
              onSubmit={e => {
                e.preventDefault()
                e.stopPropagation()
                form.handleSubmit()
              }}
            >
              <FieldGroup className='gap-3'>
                <form.Field name='email'>
                  {field => (
                    <Field data-invalid={field.state.meta.errors.length > 0}>
                      <FieldLabel>Email</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        type='email'
                        onChange={e => field.handleChange(e.target.value)}
                        aria-invalid={field.state.meta.errors.length > 0}
                        placeholder='Enter your Email'
                        autoComplete='off'
                      />
                      <FieldError errors={field.state.meta.errors.map(e => ({ message: String(e) }))} />
                    </Field>
                  )}
                </form.Field>

                <form.Field name='password'>
                  {field => (
                    <Field data-invalid={field.state.meta.errors.length > 0}>
                      <FieldLabel>Password</FieldLabel>
                      <InputGroup>
                        <InputGroupInput
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={e => field.handleChange(e.target.value)}
                          aria-invalid={field.state.meta.errors.length > 0}
                          placeholder='Enter your Password'
                          type={isVisible ? 'text' : 'password'}
                        />
                        <InputGroupAddon align='inline-end'>
                          <Button
                            variant='link'
                            type='button'
                            size='icon'
                            onClick={() => setIsVisible(prev => !prev)}
                            className='absolute inset-y-0 right-0 rounded-l-none text-muted-foreground hover:cursor-pointer hover:bg-transparent focus-visible:ring-ring/50'
                          >
                            {isVisible ? <IconEyeOff className='size-4' /> : <IconEye className='size-4' />}
                            <span className='sr-only'>{isVisible ? 'Hide password' : 'Show password'}</span>
                          </Button>
                        </InputGroupAddon>
                      </InputGroup>
                      <FieldError errors={field.state.meta.errors.map(e => ({ message: String(e) }))} />
                    </Field>
                  )}
                </form.Field>
              </FieldGroup>
            </form>
          </CardContent>

          <CardFooter>
            <Field>
              <Button type='submit' form='signin' className='w-full' disabled={form.state.isSubmitting}>
                {form.state.isSubmitting ? <Spinner className='text-primary-foreground' /> : 'Sign In'}
              </Button>

              <div className='text-center text-sm'>
                Don&apos;t have an account?{' '}
                <Link href='/auth/signup' className='underline underline-offset-4'>
                  Sign Up
                </Link>
              </div>
            </Field>
          </CardFooter>
        </Card>

        <div className='text-balance text-center text-muted-foreground text-xs *:[a]:underline *:[a]:underline-offset-4 *:[a]:hover:text-primary'>
          By clicking Sign In, you agree to our <Link href='#'>Terms of Service</Link> and
          <Link href='#'> Privacy Policy</Link>.
        </div>
      </div>
    </div>
  )
}
