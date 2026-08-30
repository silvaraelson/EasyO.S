import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

const MAX_IMAGE_BYTES = 300 * 1024; // limite generoso pra imagem embutida como base64 no PDF

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["company-settings"],
    queryFn: api.companySettings.get,
  });

  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>();
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | undefined>();
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setName(data.name);
    setDocument(data.document ?? "");
    setPhone(data.phone ?? "");
    setEmail(data.email ?? "");
    setLogoDataUrl(data.logoDataUrl);
    setSignatureDataUrl(data.signatureDataUrl);
  }, [data]);

  const mutation = useMutation({
    mutationFn: () =>
      api.companySettings.update({
        name,
        document: document || undefined,
        phone: phone || undefined,
        email: email || undefined,
        logoDataUrl,
        signatureDataUrl,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["company-settings"] }),
  });

  async function handleImagePick(
    event: React.ChangeEvent<HTMLInputElement>,
    setter: (value: string | undefined) => void,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("Imagem muito grande — use um arquivo de até 300 KB.");
      return;
    }
    setImageError(null);
    setter(await readFileAsDataUrl(file));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  if (isLoading) return <p>Carregando…</p>;
  if (error) return <p className="form-error">{(error as Error).message}</p>;

  return (
    <section>
      <h1>Configurações da empresa</h1>
      <p className="muted">
        Nome, logo e assinatura aparecem em todos os PDFs gerados (orçamento, fatura, laudo
        técnico, lista de materiais).
      </p>

      <form className="card form" onSubmit={handleSubmit}>
        <label>
          Nome da empresa
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <div className="form-row">
          <label>
            CNPJ/CPF
            <input value={document} onChange={(event) => setDocument(event.target.value)} />
          </label>
          <label>
            Telefone
            <input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
        </div>
        <label>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <div className="settings-preview">
          {logoDataUrl && <img src={logoDataUrl} alt="Logo" />}
          {signatureDataUrl && <img src={signatureDataUrl} alt="Assinatura" />}
        </div>

        <label>
          Logo
          <input
            type="file"
            accept="image/*"
            onChange={(event) => handleImagePick(event, setLogoDataUrl)}
          />
        </label>
        <label>
          Assinatura
          <input
            type="file"
            accept="image/*"
            onChange={(event) => handleImagePick(event, setSignatureDataUrl)}
          />
        </label>
        {imageError && <p className="form-error">{imageError}</p>}

        {mutation.isError && <p className="form-error">{(mutation.error as Error).message}</p>}
        {mutation.isSuccess && <p className="muted">Configurações salvas.</p>}
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando…" : "Salvar"}
        </button>
      </form>
    </section>
  );
}
