import SignupFormWrapper from "@/components/signup-form-wrapper";
import { Hydrate } from '@forgewp/react';

export default function SignUpPage() {
  return (
    <div className='flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-[#fafafa]'>
      <div className='w-full max-w-sm'>
        <Hydrate trigger="load">
          <SignupFormWrapper />
        </Hydrate>
      </div>
    </div>
  );
}
