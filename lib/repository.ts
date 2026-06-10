// Camada de acesso a dados. TODA leitura/escrita do CRM passa por aqui.
//
// A UI nunca toca no storage diretamente — consome os hooks (crm-store /
// activities-store), que por sua vez usam estes repositórios.
//
// Este arquivo é um barrel: os repositórios vivem em lib/repositories/, um
// módulo por domínio (interface + mapeadores + implementação Supabase ativa +
// instância exportada). As implementações localStorage legadas estão em
// lib/repositories/local-storage.ts, preservadas só como referência.
//
// Componentes continuam importando de "@/lib/repository" — nada muda para
// quem consome.

export * from "./repositories/deals";
export * from "./repositories/clientes";
export * from "./repositories/contatos";
export * from "./repositories/etapas";
export * from "./repositories/origens";
export * from "./repositories/tarefas";
export * from "./repositories/automacoes";
export * from "./repositories/historico";
export * from "./repositories/servicos";
export * from "./repositories/tipos-servico";
export * from "./repositories/perfis";
export * from "./repositories/metas";
export * from "./repositories/alertas";
export * from "./repositories/atividades";
export * from "./repositories/local-storage";
export * from "./repositories/snapshot";
