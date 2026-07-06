
function DisputePanel({ orderId, isCustomer }: { orderId: string; isCustomer: boolean }) {
  const qc = useQueryClient();
  const addFn = useServerFn(addDisputeEvidence);
  const { data: dispute } = useQuery({
    queryKey: ["dispute", orderId],
    queryFn: () => getMyDispute({ data: { orderId } }),
  });
  const [uploading, setUploading] = useState("");

  const addMut = useMutation({
    mutationFn: (url: string) => addFn({ data: { orderId, url } }),
    onSuccess: () => {
      toast.success("Evidence uploaded");
      setUploading("");
      qc.invalidateQueries({ queryKey: ["dispute", orderId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h2 className="font-display text-lg font-semibold">Dispute in progress</h2>
      </div>
      {dispute?.reason && (
        <div className="mt-3 rounded-lg bg-muted/40 p-3 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reason</div>
          <p className="mt-1 whitespace-pre-wrap">{dispute.reason}</p>
        </div>
      )}
      {(dispute?.evidence_urls?.length ?? 0) > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Uploaded evidence</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {dispute!.evidence_urls!.map((u: string, i: number) => (
              <a key={i} href={u} target="_blank" rel="noreferrer" className="block h-20 w-20 overflow-hidden rounded-lg border">
                <img src={u} alt={`Evidence ${i + 1}`} className="h-full w-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}
      {isCustomer && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add photo evidence</div>
          <div className="mt-2">
            <ImageUploader
              bucket="dispute-evidence"
              value={uploading}
              onChange={(url) => { if (url) addMut.mutate(url); }}
              label="Upload photo"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Our admin team reviews evidence and decides whether to refund you or release funds to the seller.</p>
        </div>
      )}
    </Card>
  );
}
