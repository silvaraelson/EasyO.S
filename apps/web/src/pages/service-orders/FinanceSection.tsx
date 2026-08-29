import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaymentMethod } from "@easy-os/schemas";
import { api, type ServiceOrderDetail } from "../../lib/api";
import { PAYMENT_METHOD_LABELS, formatCurrency } from "../../lib/labels";

interface Props {
  serviceOrderId: string;
  serviceOrder: ServiceOrderDetail;
}

interface DraftItem {
  description: string;
  quantity: string;
  unitPrice: string;
}

const EMPTY_DRAFT_ITEM: DraftItem = { description: "", quantity: "1", unitPrice: "" };

export function FinanceSection({ serviceOrderId, serviceOrder }: Props) {
  const queryClient = useQueryClient();

  const { data: materials } = useQuery({
    queryKey: ["materials"],
    queryFn: api.materials.list,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["service-orders", serviceOrderId] });
  }

  // --- materiais usados -------------------------------------------------
  const [materialId, setMaterialId] = useState("");
  const [materialQuantity, setMaterialQuantity] = useState("1");

  const addMaterialMutation = useMutation({
    mutationFn: () => api.finance.addMaterialUsage(serviceOrderId, materialId, Number(materialQuantity)),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      setMaterialId("");
      setMaterialQuantity("1");
    },
  });

  const materialsById = new Map((materials ?? []).map((material) => [material.id, material]));
  const materialsTotal = serviceOrder.materialsUsed.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );

  // --- orçamento ----------------------------------------------------------
  const [draftItems, setDraftItems] = useState<DraftItem[]>([{ ...EMPTY_DRAFT_ITEM }]);

  const createBudgetMutation = useMutation({
    mutationFn: () =>
      api.finance.createBudget(serviceOrderId, {
        items: draftItems
          .filter((item) => item.description && item.unitPrice)
          .map((item) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Math.round(Number(item.unitPrice.replace(",", ".")) * 100),
          })),
      }),
    onSuccess: () => {
      invalidate();
      setDraftItems([{ ...EMPTY_DRAFT_ITEM }]);
    },
  });

  const approveBudgetMutation = useMutation({
    mutationFn: (budgetId: string) => api.finance.approveBudget(budgetId),
    onSuccess: invalidate,
  });

  function updateDraftItem(index: number, patch: Partial<DraftItem>) {
    setDraftItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  }

  const budgetTotal =
    serviceOrder.budget?.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) ?? 0;

  // --- fatura ---------------------------------------------------------------
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");

  const createInvoiceMutation = useMutation({
    mutationFn: () => api.finance.createInvoice(serviceOrderId),
    onSuccess: invalidate,
  });

  const payInvoiceMutation = useMutation({
    mutationFn: (invoiceId: string) => api.finance.payInvoice(invoiceId, paymentMethod),
    onSuccess: invalidate,
  });

  return (
    <div className="card">
      <h2>Financeiro</h2>

      <section className="finance-block">
        <h3>Materiais usados</h3>
        {serviceOrder.materialsUsed.length === 0 && <p className="muted">Nenhum material lançado.</p>}
        {serviceOrder.materialsUsed.length > 0 && (
          <ul className="plain-list">
            {serviceOrder.materialsUsed.map((item) => (
              <li key={item.id}>
                {item.quantity}× {materialsById.get(item.materialId)?.description ?? item.materialId} —{" "}
                {formatCurrency(item.quantity * item.unitPrice)}
              </li>
            ))}
          </ul>
        )}
        <p className="muted">Subtotal materiais: {formatCurrency(materialsTotal)}</p>

        <form
          className="form-row"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            addMaterialMutation.mutate();
          }}
        >
          <select value={materialId} onChange={(event) => setMaterialId(event.target.value)} required>
            <option value="">Selecione um material…</option>
            {materials?.map((material) => (
              <option key={material.id} value={material.id}>
                {material.description} ({material.stockQuantity} em estoque)
              </option>
            ))}
          </select>
          <input
            className="short"
            type="number"
            min={1}
            value={materialQuantity}
            onChange={(event) => setMaterialQuantity(event.target.value)}
            required
          />
          <button type="submit" disabled={addMaterialMutation.isPending || !materialId}>
            {addMaterialMutation.isPending ? "Adicionando…" : "Adicionar"}
          </button>
        </form>
        {addMaterialMutation.isError && (
          <p className="form-error">{(addMaterialMutation.error as Error).message}</p>
        )}
      </section>

      <section className="finance-block">
        <h3>Orçamento</h3>
        {serviceOrder.budget ? (
          <>
            <ul className="plain-list">
              {serviceOrder.budget.items.map((item) => (
                <li key={item.id}>
                  {item.quantity}× {item.description} — {formatCurrency(item.quantity * item.unitPrice)}
                </li>
              ))}
            </ul>
            <p className="muted">Subtotal orçamento: {formatCurrency(budgetTotal)}</p>
            {serviceOrder.budget.approvedByCustomerAt ? (
              <p className="muted">
                Aprovado em{" "}
                {new Date(serviceOrder.budget.approvedByCustomerAt).toLocaleString("pt-BR")}
              </p>
            ) : (
              <button
                type="button"
                className="button-secondary"
                disabled={approveBudgetMutation.isPending}
                onClick={() => approveBudgetMutation.mutate(serviceOrder.budget!.id)}
              >
                {approveBudgetMutation.isPending ? "Aprovando…" : "Marcar como aprovado pelo cliente"}
              </button>
            )}
          </>
        ) : (
          <form
            className="form"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              createBudgetMutation.mutate();
            }}
          >
            {draftItems.map((item, index) => (
              <div className="form-row" key={index}>
                <input
                  placeholder="Descrição (mão de obra, item…)"
                  value={item.description}
                  onChange={(event) => updateDraftItem(index, { description: event.target.value })}
                />
                <input
                  className="short"
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(event) => updateDraftItem(index, { quantity: event.target.value })}
                />
                <input
                  className="short"
                  inputMode="decimal"
                  placeholder="Valor unit. (R$)"
                  value={item.unitPrice}
                  onChange={(event) => updateDraftItem(index, { unitPrice: event.target.value })}
                />
              </div>
            ))}
            <button
              type="button"
              className="button-secondary"
              onClick={() => setDraftItems((current) => [...current, { ...EMPTY_DRAFT_ITEM }])}
            >
              + item
            </button>
            {createBudgetMutation.isError && (
              <p className="form-error">{(createBudgetMutation.error as Error).message}</p>
            )}
            <button type="submit" disabled={createBudgetMutation.isPending}>
              {createBudgetMutation.isPending ? "Salvando…" : "Criar orçamento"}
            </button>
          </form>
        )}
      </section>

      <section className="finance-block">
        <h3>Fatura</h3>
        {serviceOrder.invoice ? (
          <>
            <p>Total: {formatCurrency(serviceOrder.invoice.totalAmount)}</p>
            {serviceOrder.invoice.paidAt ? (
              <p className="muted">
                Paga em {new Date(serviceOrder.invoice.paidAt).toLocaleString("pt-BR")}
                {serviceOrder.invoice.paymentMethod &&
                  ` — ${PAYMENT_METHOD_LABELS[serviceOrder.invoice.paymentMethod]}`}
              </p>
            ) : (
              <form
                className="form-row"
                onSubmit={(event: FormEvent) => {
                  event.preventDefault();
                  payInvoiceMutation.mutate(serviceOrder.invoice!.id);
                }}
              >
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                >
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button type="submit" disabled={payInvoiceMutation.isPending}>
                  {payInvoiceMutation.isPending ? "Registrando…" : "Marcar como paga"}
                </button>
              </form>
            )}
            <a
              className="button-secondary"
              href={api.finance.invoicePdfUrl(serviceOrder.invoice.id)}
              target="_blank"
              rel="noreferrer"
            >
              Baixar PDF
            </a>
          </>
        ) : (
          <button
            type="button"
            onClick={() => createInvoiceMutation.mutate()}
            disabled={createInvoiceMutation.isPending}
          >
            {createInvoiceMutation.isPending ? "Gerando…" : "Gerar fatura"}
          </button>
        )}
        {createInvoiceMutation.isError && (
          <p className="form-error">{(createInvoiceMutation.error as Error).message}</p>
        )}
      </section>
    </div>
  );
}
