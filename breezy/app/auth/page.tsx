"use client";
import I18nProvider from '../(main)/I18nProvider';
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ChangeEvent, FormEvent } from "react";

const API_URL = "http://localhost:3000/api/auth";

export default function AuthPage() {
  const { t } = useTranslation('auth');

  const [isLogin, setIsLogin] = useState(true);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const endpoint = isLogin ? "/login" : "/register";

      const body = isLogin
        ? { email: form.email, password: form.password }
        : form;

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || t('login.error_fallback'));

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("userId", data.userId);

      setMessage(isLogin ? t('login.success_login') : t('login.success_register'));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('login.error_unknown'));
    }

    setLoading(false);
  };

  return (
    <I18nProvider>
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="w-full max-w-md">

          {/* Card */}
          <div className="border border-gray-200 rounded-2xl shadow-sm p-8 bg-white">

            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-800">
                {isLogin ? t('login.login_title') : t('login.register_title')}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {t('login.subtitle')}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">

              {!isLogin && (
                <div>
                  <label className="text-sm text-gray-600">{t('login.username_label')}</label>
                  <input
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E7490]"
                  />
                </div>
              )}

              <div>
                <label className="text-sm text-gray-600">{t('login.email_label')}</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">{t('login.password_label')}</label>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9333EA]"
                />
              </div>

              {/* Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded-lg font-medium text-white transition
              bg-[#0E7490] hover:bg-[#0c6278] disabled:opacity-50"
              >
                {loading
                  ? t('login.loading')
                  : isLogin
                    ? t('login.login_btn')
                    : t('login.register_btn')}
              </button>
            </form>

            {/* Message */}
            {message && (
              <p className="text-center text-sm mt-4 text-gray-600">
                {message}
              </p>
            )}

            {/* Switch */}
            <div className="mt-6 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm font-medium text-[#0E7490] hover:text-[#3B82F6]"
              >
                {isLogin
                  ? t('login.switch_to_register')
                  : t('login.switch_to_login')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </I18nProvider>
  );
}