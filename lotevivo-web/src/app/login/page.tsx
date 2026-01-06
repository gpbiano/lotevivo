"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { setToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      const token = data.session?.access_token;
      if (!token) throw new Error("Não veio access_token do Supabase");

      setToken(token);
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  async function onForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const normalizedEmail = email.trim();
      if (!normalizedEmail) throw new Error("Informe seu email");

      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
      if (error) throw error;

      setSuccess("Se o email existir, enviamos um link para redefinir sua senha.");
    } catch (err: any) {
      setError(err?.message ?? "Erro ao solicitar redefinição de senha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* FUNDO (linhas/ondas visíveis) */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* base verde */}
        <div className="absolute inset-0 bg-emerald-50/70" />

        {/* ondas (fixadas no rodapé e sem cortar) */}
        <Image
          src="/bg-waves.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-contain object-bottom opacity-95"
        />

        {/* clareia só a parte de cima (não apaga as ondas) */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white/70 to-transparent" />

        {/* vinheta leve no topo */}
        <div className="absolute inset-x-0 top-0 h-[55%] bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.25),rgba(255,255,255,0.85)_70%)]" />
      </div>

      {/* CONTEÚDO (fica acima do fundo) */}
      <div className="relative z-10 mx-auto flex h-full max-w-6xl items-center justify-center px-4 pb-12 md:px-8">
        <div className="relative w-full max-w-4xl overflow-hidden rounded-[32px] border border-zinc-200/80 bg-white/85 shadow-[0_28px_90px_rgba(0,0,0,0.12)] backdrop-blur">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* LEFT (texto / branding) */}
            <div className="relative p-8 md:p-10">
              {/* acento verde sutil */}
              <div className="pointer-events-none absolute -left-24 top-10 h-56 w-56 rounded-full bg-emerald-200/40 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl" />

              <div className="relative">
                <div className="flex items-center gap-4">
                  {/* LOGO BEM MAIOR */}
                  <div className="grid h-20 w-20 place-items-center rounded-3xl bg-white shadow-sm">
                    <Image
                      src="/logo.png"
                      alt="LoteVivo"
                      width={96}
                      height={96}
                      priority
                      className="h-16 w-16 object-contain"
                    />
                  </div>

                  <div>
                    <p className="text-lg font-semibold text-zinc-900 leading-none">LoteVivo</p>
                    <p className="mt-1 text-sm text-zinc-600 leading-none">
                      Sistema de Gestão Pecuária
                    </p>
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
                    Gestão pecuária simples, rápida e rastreável.
                  </h2>
                  <p className="text-sm leading-relaxed text-zinc-600">
                    Centralize lotes, movimentações e indicadores do seu rebanho em um só lugar.
                  </p>

                  {/* IMAGEM ABAIXO DO TEXTO */}
                  <div className="pt-3">
                    <div className="relative w-full max-w-[420px]">
                      <Image
                        src="/login-hero.png"
                        alt="LoteVivo"
                        width={840}
                        height={520}
                        priority
                        className="h-auto w-full select-none object-contain"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT (login) */}
            <div className="relative border-t border-zinc-200/70 p-8 md:border-l md:border-t-0 md:p-10">
              <div className="mb-7 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {mode === "login" ? "Entrar" : "Recuperar senha"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {mode === "login"
                      ? "Acesse sua conta com e-mail e senha."
                      : "Informe seu e-mail para receber o link."}
                  </p>
                </div>

                <a
                  href="https://gplabs.com.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 shadow-sm hover:shadow transition"
                >
                  <span className="text-zinc-500">Um produto</span>
                  <Image
                    src="/gp-labs.png"
                    alt="GP Labs"
                    width={18}
                    height={18}
                    className="opacity-80"
                  />
                  <span className="font-medium text-zinc-800"></span>
                </a>
              </div>

              {/* SSO em breve */}
              <div className="mb-7">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Acessar com outros serviços
                </p>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    disabled
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-400 shadow-sm"
                    title="Em breve"
                  >
                    <span className="text-base">G</span>
                    Continuar com Google (em breve)
                  </button>

                  <button
                    type="button"
                    disabled
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-500 shadow-sm"
                    title="Em breve"
                  >
                    Continuar com SSO (em breve)
                  </button>
                </div>

                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-zinc-200" />
                  <span className="text-xs text-zinc-400">ou</span>
                  <div className="h-px flex-1 bg-zinc-200" />
                </div>
              </div>

              {/* FORM */}
              {mode === "login" ? (
                <form onSubmit={onLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-800">Acessar com e-mail</label>
                    <input
                      className="w-full rounded-xl border border-zinc-200 bg-white/90 px-3 py-2.5 text-sm outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-300"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e-mail@provedor.com.br"
                      required
                      autoComplete="email"
                      inputMode="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-800">Senha</label>
                    <input
                      className="w-full rounded-xl border border-zinc-200 bg-white/90 px-3 py-2.5 text-sm outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-300"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                    />
                  </div>

                  <button
                    disabled={loading}
                    className="w-full rounded-xl bg-emerald-600 px-4 py-2.75 text-sm font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60"
                    type="submit"
                  >
                    {loading ? "Entrando..." : "Continuar com e-mail"}
                  </button>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      className="text-sm text-zinc-600 hover:text-zinc-900 underline underline-offset-4"
                      onClick={() => {
                        setMode("forgot");
                        setPassword("");
                        setError(null);
                        setSuccess(null);
                      }}
                      disabled={loading}
                    >
                      Esqueci minha senha
                    </button>

                    <span className="text-xs text-zinc-400">Acesso protegido</span>
                  </div>
                </form>
              ) : (
                <form onSubmit={onForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-800">Acessar com e-mail</label>
                    <input
                      className="w-full rounded-xl border border-zinc-200 bg-white/90 px-3 py-2.5 text-sm outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-300"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e-mail@provedor.com.br"
                      required
                      autoComplete="email"
                      inputMode="email"
                    />
                  </div>

                  <button
                    disabled={loading}
                    className="w-full rounded-xl bg-emerald-600 px-4 py-2.75 text-sm font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60"
                    type="submit"
                  >
                    {loading ? "Enviando..." : "Enviar link"}
                  </button>

                  <button
                    type="button"
                    className="text-sm text-zinc-600 hover:text-zinc-900 underline underline-offset-4"
                    onClick={() => {
                      setMode("login");
                      setError(null);
                      setSuccess(null);
                    }}
                    disabled={loading}
                  >
                    Voltar para login
                  </button>
                </form>
              )}

              {error ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                  {success}
                </div>
              ) : null}

              <p className="mt-6 text-xs leading-relaxed text-zinc-500">
                Ao continuar, você concorda com os{" "}
                <span className="text-emerald-700 underline underline-offset-4">Termos</span> e a{" "}
                <span className="text-emerald-700 underline underline-offset-4">
                  Política de Privacidade
                </span>
                .
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé fixo */}
      <footer className="absolute bottom-4 left-0 right-0 z-10 text-center text-xs text-zinc-400">
        LoteVivo • Sistema de Gestão Pecuária
      </footer>
    </div>
  );
}
