export const metadata = {
  title: "Login",
  description:
    "Sign in to your Learnova account. Access your student, teacher, or institution dashboard.",
  openGraph: {
    title: "Login | Learnova",
    description: "Sign in to your Learnova account.",
    url: "https://learnova-web.vercel.app/auth",
  },
};

export default function AuthLayout({ children }) {
  return children;
}
