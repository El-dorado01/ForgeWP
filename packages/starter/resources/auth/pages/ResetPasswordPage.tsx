import ResetPasswordFormWrapper from "@/components/reset-password-form-wrapper";

export default function ResetPasswordPage() {
  return (
    <div className='flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-[#fafafa]'>
      <div className='w-full max-w-md'>
        <ResetPasswordFormWrapper />
      </div>
    </div>
  );
}
