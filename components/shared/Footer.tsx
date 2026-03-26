export default function Footer() {
  return (
    <footer className='container mx-auto my-10'>
      <div className='grid grid-cols-1 gap-6 sm:grid-cols-3'>
        <div>
          <div className='font-semibold text-lg'>UrbanMart</div>
          <p className='mt-2 text-muted-foreground text-sm'>
            A better shopping experience. Reliable delivery. Fair prices.
          </p>
        </div>

        <div>
          <h4 className='font-medium'>Company</h4>
          <div className='mt-2 text-muted-foreground text-sm'>About · Careers · Press</div>
        </div>

        <div>
          <h4 className='font-medium'>Support</h4>
          <div className='mt-2 text-muted-foreground text-sm'>Help Center · Returns · Shipping</div>
        </div>
      </div>

      <div className='mt-8 border-t pt-6 text-muted-foreground text-sm'>
        © <ThisYear /> UrbanMart. All rights reserved.
      </div>
    </footer>
  )
}

async function ThisYear() {
  'use cache'

  return <>{new Date().getFullYear()}</>
}
