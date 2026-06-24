import ForgotPasswordFormWrapper from "@/components/forgot-password-form-wrapper";
import { Hydrate } from "@forgewp/react";

export default function ForgotPasswordPage() {
  return (
    <div className='flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-[#fafafa]'>
      <div className='w-full max-w-md'>
        <Hydrate trigger="load">
          <ForgotPasswordFormWrapper />
        </Hydrate>
      </div>
    </div>
  );
}
