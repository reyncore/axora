// Layout tanpa sidebar — digunakan untuk halaman login & register
// Route group (auth) tidak mempengaruhi URL

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
