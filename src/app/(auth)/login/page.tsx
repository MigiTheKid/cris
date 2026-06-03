"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./login.module.css";
import { LoginDots } from "./LoginDots";

function maskCpf(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export default function LoginPage() {
  const router = useRouter();
  const [cpf, setCpf] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Auth real (Supabase) entra na próxima fase. Por ora navega ao painel.
    setTimeout(() => router.push("/painel"), 600);
  }

  return (
    <>
      <LoginDots />
      <div className={styles.loginVeil} />

      <main className={styles.loginStage}>
        <div className={styles.authCard}>
          {/* ---------- Marca ---------- */}
          <aside className={styles.authBrand}>
            <div className={styles.brandTop}>
              <span className={styles.brandEmblem}>
                <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
                  <defs>
                    <linearGradient id="cm" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#f8c72d" />
                      <stop offset="1" stopColor="#f0a800" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M24 3 7 9v13c0 11 7.6 18.4 17 21 9.4-2.6 17-10 17-21V9L24 3z"
                    fill="rgba(0,0,0,0.22)"
                    stroke="rgba(248,199,45,0.45)"
                    strokeWidth="1"
                  />
                  <path
                    d="M24 14s7 7.4 7 12.4A7 7 0 1 1 17 26.4C17 21.4 24 14 24 14z"
                    fill="url(#cm)"
                  />
                </svg>
              </span>
              <span className={styles.brandName}>
                CRIS<small>Centro de Comando</small>
              </span>
            </div>

            <div className={styles.brandMid}>
              <h1 className={styles.brandH}>
                Seu copiloto
                <br />
                na estrada.
              </h1>
              <p className={styles.brandP}>
                O CRIS cuida da frota e avisa antes que qualquer documento vença — você nunca é pego
                de surpresa.
              </p>
              <ul className={styles.brandPoints}>
                <li>
                  <span className={styles.bpIco}>
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3z" />
                      <path d="M9.5 12l2 2 3.5-4" />
                    </svg>
                  </span>
                  Frota sempre em conformidade
                </li>
                <li>
                  <span className={styles.bpIco}>
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M7 3v3M17 3v3M4 8h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" />
                    </svg>
                  </span>
                  Vencimentos avisados com antecedência
                </li>
                <li>
                  <span className={styles.bpIco}>
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" />
                      <circle cx="7" cy="17" r="1.6" />
                      <circle cx="17.5" cy="17" r="1.6" />
                    </svg>
                  </span>
                  Motoristas e veículos protegidos
                </li>
              </ul>
            </div>

            <div className={styles.brandFoot}>
              <span>uma plataforma</span>
              <Image
                className={styles.brandFootLogo}
                src="/top-diesel.png"
                alt="TOP DIESEL"
                width={96}
                height={30}
              />
            </div>
          </aside>

          {/* ---------- Formulário ---------- */}
          <section className={styles.authForm}>
            <h2 className={styles.afTitle}>Entrar</h2>
            <p className={styles.afSub}>Acesse o painel da sua frota</p>

            <form onSubmit={onSubmit}>
              <div className={styles.afFields}>
                <div className={styles.field}>
                  <label htmlFor="cpf">CPF</label>
                  <div className={styles.input}>
                    <span className={styles.iIco}>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0" />
                      </svg>
                    </span>
                    <input
                      id="cpf"
                      name="cpf"
                      inputMode="numeric"
                      autoComplete="username"
                      placeholder="000.000.000-00"
                      maxLength={14}
                      value={cpf}
                      onChange={(e) => setCpf(maskCpf(e.target.value))}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="pw">Senha</label>
                  <div className={styles.input}>
                    <span className={styles.iIco}>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="4" y="10" width="16" height="11" rx="2" />
                        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                      </svg>
                    </span>
                    <input
                      id="pw"
                      name="pw"
                      type={showPw ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      className={styles.pwToggle}
                      aria-label={showPw ? "Ocultar senha" : "Mostrar senha"}
                      onClick={() => setShowPw((v) => !v)}
                    >
                      {showPw ? (
                        <svg
                          width="19"
                          height="19"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.4 5.2A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a16 16 0 0 1-3.2 4M6.2 6.2A16 16 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 3-.5" />
                        </svg>
                      ) : (
                        <svg
                          width="19"
                          height="19"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.afRow}>
                <a href="#" className={styles.afLink}>
                  Esqueci minha senha
                </a>
              </div>

              <button type="submit" className={styles.afSubmit} disabled={loading}>
                {loading ? (
                  "Entrando…"
                ) : (
                  <>
                    Entrar
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className={styles.afFirstaccess}>
              Primeiro acesso? <b>Fale com o Gabriel</b> para receber seu login e senha.
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
