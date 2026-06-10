// ESLint flat config (eslint-config-next v16 exporta flat configs nativos).
// core-web-vitals: regras Next + React + react-hooks (exhaustive-deps).
// typescript: typescript-eslint recommended (inclui no-unused-vars).
import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      // Edge Function roda em Deno (imports https://) — fora do escopo do lint.
      "supabase/functions/**",
      "next-env.d.ts",
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // Regras novas do react-hooks v7 que conflitam com padrões deliberados
      // do projeto (documentados no CLAUDE.md):
      // - refs: o espelho `ref.current = state` durante o render é o padrão
      //   dos providers (callbacks estáveis sem dados velhos).
      // - set-state-in-effect: boot SSR-safe (tema, carregamento inicial)
      //   seta estado no efeito de montagem por design.
      // exhaustive-deps permanece ativa.
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
