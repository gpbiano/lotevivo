"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { setToken } from "@/lib/auth";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [ready, setReady] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Quando o usuário chega pelo link do Supabase, a sessão pode ser aplicada automaticamente.
    // Vamos garantir que existe sessão (ou pelo menos que o usuário veio pelo fluxo correto).
    let mounted = true;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!data.session) {
          // Ainda assim, pode demorar um instante dependendo do navegador/redirect.
          // Vamos ouvir o evento de auth para capturar quando a sessão entrar.
          const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!mounted) return;
            if (session?.access_token) {
              setToken(session.access_token);
              setReady(true);
            }
          });

          // fallback: espera curtinho e tenta de novo
          setTimeout(async () => {
            if (!mounted) return;
            const { data } = await supabase.auth.getSession();
            if (data.session?.access_token) {
              setToken(data.session.access_token);
              setReady(true);
            } else {
              setReady(true);
            }
          }, 600);

          return () => {
            sub.subscription.unsubscribe();
          };
        }

        // Se já tem sessão, ok
        if (data.session?.access_token) {
          setToken(data.session.access_token);
        }
      } catch (err: any) {
        setError(err?.message ?? "Erro ao validar sessão de reset");
      } finally {
        if (mounted) setReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!password || password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setSuccess("Senha atualizada com sucesso. Você já pode entrar.");
      setTimeout(() => router.replace("/login"), 1200);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao atualizar senha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md border rounded-2xl p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Redefinir senha</h1>
          <p className="text-sm text-neutral-500">
            Digite sua nova senha abaixo.
          </p>
        </div>

        {!ready ? (
          <div className="text-sm text-neutral-600">Carregando…</div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm">Nova senha</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <p className="text-xs text-neutral-500">Mínimo 6 caracteres.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm">Confirmar nova senha</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                className="text-sm underline text-neutral-700"
                onClick={() => router.replace("/login")}
              >
                Voltar para login
              </button>

              <button
                disabled={loading}
                className="bg-black text-white rounded-lg px-4 py-2 disabled:opacity-60"
                type="submit"
              >
                {loading ? "Salvando..." : "Salvar senha"}
              </button>
            </div>
          </form>
        )}

        {error ? (
          <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-lg p-3">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="text-sm text-green-700 border border-green-200 bg-green-50 rounded-lg p-3">
            {success}
          </div>
        ) : null}
      </div>
    </div>
  );
}
