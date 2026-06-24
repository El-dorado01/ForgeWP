import VerifyEmailViewWrapper from "@/components/verify-email-view-wrapper";
import { Hydrate } from "@forgewp/react";

export default function VerifyEmailPage() {
  return (
    <div className='flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-[#fafafa]'>
      <div className='w-full max-w-md'>
        <Hydrate trigger="load">
          <VerifyEmailViewWrapper />
        </Hydrate>
      </div>
    </div>
  );
}
