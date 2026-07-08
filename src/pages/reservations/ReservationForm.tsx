import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DEPARTMENT_VENUES, EQUIPMENT_LIST, DOCUMENT_TYPES } from "@/types";
import { Calendar, Users, FileText, Package, Wrench, MapPin, AlertTriangle } from "lucide-react";
import styles from "./ReservationForm.module.css";

interface FormData {
  activity_date: string;
  activity_name: string;
  purpose: string;
  department: string;
  event_duration: number;
  internal_participants: number;
  external_participants: number;
  security_guards: number;
  service_crew: number;
  setup_instructions: string;
  ingress_date: string;
  egress_date: string;
  selectedVenues: string[];
  selectedEquipment: { name: string; quantity: number; notes: string }[];
  documents: { type: string; file: File | null; fileName: string; existingUrl?: string; existingId?: string }[];
}

export function ReservationForm() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isEditMode = Boolean(editId);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(isEditMode);
  const [form, setForm] = useState<FormData>({
    activity_date: "", activity_name: "", purpose: "", department: "",
    event_duration: 1, internal_participants: 0, external_participants: 0,
    security_guards: 0, service_crew: 0, setup_instructions: "",
    ingress_date: "", egress_date: "", selectedVenues: [],
    selectedEquipment: [], documents: [],
  });

  useEffect(() => {
    if (!isEditMode || !editId) return;
    (async () => {
      setDataLoading(true);
      const { data, error } = await supabase
        .from("reservations")
        .select("*, venues:reservation_venues(*, facility:facilities(*)), equipment:reservation_equipment(*), documents:reservation_documents(*)")
        .eq("id", editId)
        .maybeSingle();

      if (error || !data) {
        showToast("Failed to load reservation", "error");
        navigate("/reservations");
        return;
      }

      const res = data as {
        id: string; activity_date: string; activity_name: string; purpose: string; department: string;
        event_duration: number; internal_participants: number; external_participants: number;
        security_guards: number; service_crew: number; setup_instructions: string | null;
        ingress_date: string | null; egress_date: string | null; status: string;
        venues: { venue_name: string | null; facility: { name: string } | null }[];
        equipment: { equipment_name: string; quantity: number; notes: string | null }[];
        documents: { id: string; document_type: string; file_name: string; file_url: string }[];
      };

      if (res.status !== "pending" && res.status !== "revision_requested") {
        showToast("This reservation cannot be edited", "error");
        navigate("/reservations");
        return;
      }

      const venueNames = res.venues.map((v) => v.venue_name || v.facility?.name || "").filter(Boolean);
      const toLocalInput = (d: string | null) => {
        if (!d) return "";
        const dt = new Date(d);
        const off = dt.getTimezoneOffset();
        return new Date(dt.getTime() - off * 60000).toISOString().slice(0, 16);
      };

      setForm({
        activity_date: res.activity_date,
        activity_name: res.activity_name,
        purpose: res.purpose,
        department: res.department,
        event_duration: res.event_duration,
        internal_participants: res.internal_participants,
        external_participants: res.external_participants,
        security_guards: res.security_guards,
        service_crew: res.service_crew,
        setup_instructions: res.setup_instructions || "",
        ingress_date: toLocalInput(res.ingress_date),
        egress_date: toLocalInput(res.egress_date),
        selectedVenues: venueNames,
        selectedEquipment: res.equipment.map((e) => ({ name: e.equipment_name, quantity: e.quantity, notes: e.notes || "" })),
        documents: res.documents.map((d) => ({ type: d.document_type, file: null, fileName: d.file_name, existingUrl: d.file_url, existingId: d.id })),
      });
      setDataLoading(false);
    })();
  }, [editId, isEditMode, navigate, showToast]);

  const handleChange = (field: keyof FormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleVenue = (venue: string) => {
    setForm((prev) => ({
      ...prev,
      selectedVenues: prev.selectedVenues.includes(venue)
        ? prev.selectedVenues.filter((v) => v !== venue)
        : [...prev.selectedVenues, venue],
    }));
  };

  const addEquipment = (name: string) => {
    if (form.selectedEquipment.find((e) => e.name === name)) return;
    setForm((prev) => ({ ...prev, selectedEquipment: [...prev.selectedEquipment, { name, quantity: 1, notes: "" }] }));
  };

  const updateEquipment = (name: string, field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, selectedEquipment: prev.selectedEquipment.map((e) => e.name === name ? { ...e, [field]: value } : e) }));
  };

  const removeEquipment = (name: string) => {
    setForm((prev) => ({ ...prev, selectedEquipment: prev.selectedEquipment.filter((e) => e.name !== name) }));
  };

  const addDocument = (type: string) => {
    if (form.documents.find((d) => d.type === type)) return;
    setForm((prev) => ({ ...prev, documents: [...prev.documents, { type, file: null, fileName: "" }] }));
  };

  const updateDocumentFile = (type: string, file: File) => {
    setForm((prev) => ({
      ...prev,
      documents: prev.documents.map((d) =>
        d.type === type ? { ...d, file, fileName: file.name } : d
      ),
    }));
  };

  const removeDocument = (type: string) => {
    setForm((prev) => ({ ...prev, documents: prev.documents.filter((d) => d.type !== type) }));
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!form.activity_date || !form.activity_name || !form.purpose || !form.department) { showToast("Please fill in all required fields", "warning"); return false; }
        if (!isEditMode && new Date(form.activity_date) < new Date(new Date().toISOString().split("T")[0])) { showToast("Activity date cannot be in the past", "error"); return false; }
        return true;
      case 2:
        if (form.selectedVenues.length === 0) { showToast("Please select at least one venue", "warning"); return false; }
        return true;
      case 4:
        if (form.documents.length === 0) { showToast("Please upload at least one supporting document", "warning"); return false; }
        if (form.documents.some((d) => !d.file && !d.existingUrl)) { showToast("Please select a file for each added document type", "warning"); return false; }
        return true;
      case 6:
        if (!form.ingress_date || !form.egress_date) { showToast("Please specify ingress and egress dates", "warning"); return false; }
        if (new Date(form.egress_date) <= new Date(form.ingress_date)) { showToast("Egress must be after ingress", "error"); return false; }
        return true;
      default: return true;
    }
  };

  const handleSubmit = async () => {
    if (!user) { showToast("Please sign in first", "error"); return; }
    setLoading(true);

    const reservationPayload = {
      activity_date: form.activity_date, activity_name: form.activity_name,
      purpose: form.purpose, department: form.department, event_duration: form.event_duration,
      internal_participants: form.internal_participants, external_participants: form.external_participants,
      security_guards: form.security_guards, service_crew: form.service_crew,
      setup_instructions: form.setup_instructions, ingress_date: form.ingress_date || null,
      egress_date: form.egress_date || null,
    };

    let reservationId: string;
    let wasRevision = false;

    if (isEditMode && editId) {
      const { data: existing } = await supabase.from("reservations").select("status").eq("id", editId).maybeSingle();
      wasRevision = existing?.status === "revision_requested";

      const { error: updateError } = await supabase.from("reservations").update({
        ...reservationPayload,
        status: wasRevision ? "pending" : undefined,
      }).eq("id", editId);

      if (updateError) { setLoading(false); showToast(updateError.message, "error"); return; }
      reservationId = editId;

      await supabase.from("reservation_venues").delete().eq("reservation_id", reservationId);
      await supabase.from("reservation_equipment").delete().eq("reservation_id", reservationId);
    } else {
      const { data: resData, error: resError } = await supabase.from("reservations").insert({
        user_id: user.id, ...reservationPayload, status: "pending",
      }).select().single();

      if (resError || !resData) { setLoading(false); showToast(resError?.message || "Failed to create reservation", "error"); return; }
      reservationId = resData.id;
    }

    for (const venueName of form.selectedVenues) {
      const { data: facilityData } = await supabase.from("facilities").select("id").eq("name", venueName).maybeSingle();
      await supabase.from("reservation_venues").insert({
        reservation_id: reservationId, facility_id: facilityData?.id || null,
        venue_name: venueName,
        start_time: new Date(form.activity_date).toISOString(),
        end_time: new Date(new Date(form.activity_date).getTime() + form.event_duration * 3600000).toISOString(),
      });
    }

    for (const eq of form.selectedEquipment) {
      await supabase.from("reservation_equipment").insert({ reservation_id: reservationId, equipment_name: eq.name, quantity: eq.quantity, notes: eq.notes || null });
    }

    if (isEditMode && editId) {
      for (const doc of form.documents) {
        if (doc.file && doc.existingId) {
          await supabase.from("reservation_documents").delete().eq("id", doc.existingId);
        }
        if (doc.file) {
          const filePath = `${user.id}/${reservationId}/${doc.type.replace(/\s+/g, "_")}_${doc.file.name}`;
          const { error: uploadError } = await supabase.storage.from("reservation-documents").upload(filePath, doc.file, { upsert: true });
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from("reservation-documents").getPublicUrl(filePath);
            await supabase.from("reservation_documents").insert({
              reservation_id: reservationId, document_type: doc.type,
              file_name: doc.fileName, file_url: urlData?.publicUrl || "#",
              file_size: doc.file.size, file_type: doc.file.type,
            });
          }
        }
      }
    } else {
      for (const doc of form.documents) {
        let fileUrl = "#";
        let fileSize: number | null = null;
        let fileType: string | null = null;

        if (doc.file) {
          const filePath = `${user.id}/${reservationId}/${doc.type.replace(/\s+/g, "_")}_${doc.file.name}`;
          const { error: uploadError } = await supabase.storage.from("reservation-documents").upload(filePath, doc.file, { upsert: true });
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from("reservation-documents").getPublicUrl(filePath);
            fileUrl = urlData?.publicUrl || "#";
          }
          fileSize = doc.file.size;
          fileType = doc.file.type;
        }

        await supabase.from("reservation_documents").insert({
          reservation_id: reservationId, document_type: doc.type,
          file_name: doc.fileName || doc.type, file_url: fileUrl,
          file_size: fileSize, file_type: fileType,
        });
      }
    }

    if (isEditMode) {
      await supabase.from("approvals").insert({
        reservation_id: reservationId, approver_id: user.id,
        action: wasRevision ? "submitted" : "reviewed",
        comments: wasRevision ? "Reservation revised and resubmitted by user" : "Reservation updated by user",
      });

      const { data: admins } = await supabase.from("profiles").select("id").in("role", ["admin", "faculty"]);
      if (admins) {
        for (const admin of admins) {
          await supabase.from("notifications").insert({
            user_id: admin.id, title: "Reservation Updated",
            message: `Reservation "${form.activity_name}" has been ${wasRevision ? "revised and resubmitted" : "updated"} by the user.`,
            type: "info", related_id: reservationId, related_type: "reservation",
          });
        }
      }
    }

    setLoading(false);
    showToast(isEditMode ? "Reservation updated successfully!" : "Reservation submitted successfully!", "success");
    navigate("/reservations");
  };

  const steps = [
    { id: 1, label: "Event Info", icon: Calendar },
    { id: 2, label: "Venues", icon: MapPin },
    { id: 3, label: "Manpower", icon: Users },
    { id: 4, label: "Documents", icon: FileText },
    { id: 5, label: "Equipment", icon: Package },
    { id: 6, label: "Setup", icon: Wrench },
  ];

  const showLedWallRestriction = form.selectedEquipment.find((e) => e.name === "LED Video Wall") && !form.selectedVenues.includes("2F Student Plaza");

  if (dataLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Loading reservation...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{isEditMode ? "Edit Reservation" : "New Reservation"}</h1>
        <p className={styles.subtitle}>{isEditMode ? "Update your reservation details" : "Complete all steps to submit your reservation request"}</p>
      </div>

      <div className={styles.steps}>
        {steps.map((s) => {
          const Icon = s.icon;
          const stepClass = step === s.id ? styles.stepActive : step > s.id ? styles.stepCompleted : styles.stepDefault;
          return (
            <button key={s.id} onClick={() => setStep(s.id)} className={[styles.stepButton, stepClass].join(" ")}>
              <Icon size={16} />
              {s.label}
            </button>
          );
        })}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle><Calendar size={20} style={{ color: "var(--brand)" }} />Event Information</CardTitle></CardHeader>
          <CardContent>
            <div className={styles.grid2}>
              <Input label="Request Date" value={new Date().toLocaleDateString()} disabled />
              <Input label="Activity Date *" type="date" value={form.activity_date} onChange={(e) => handleChange("activity_date", e.target.value)} min={isEditMode ? undefined : new Date().toISOString().split("T")[0]} />
              <Input label="Activity Name *" placeholder="e.g., General Assembly 2024" value={form.activity_name} onChange={(e) => handleChange("activity_name", e.target.value)} />
              <Select label="Department *" value={form.department} onChange={(e) => handleChange("department", e.target.value)} options={[{ value: "", label: "Select department" }, { value: "FO", label: "Facilities Office (FO)" }, { value: "RO", label: "Registrar's Office (RO)" }, { value: "AERO", label: "Aero Department (AERO)" }, { value: "IT", label: "IT Department" }, { value: "CS", label: "Computer Science" }, { value: "ENG", label: "Engineering" }, { value: "BUS", label: "Business" }, { value: "ART", label: "Arts & Sciences" }]} />
              <Select label="Event Duration (hours) *" value={String(form.event_duration)} onChange={(e) => handleChange("event_duration", parseInt(e.target.value))} options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `${i + 1} hour${i > 0 ? "s" : ""}` }))} />
              <Input label="Internal Participants" type="number" min={0} value={form.internal_participants} onChange={(e) => handleChange("internal_participants", parseInt(e.target.value) || 0)} />
              <Input label="External Participants" type="number" min={0} value={form.external_participants} onChange={(e) => handleChange("external_participants", parseInt(e.target.value) || 0)} />
            </div>
            <Textarea label="Purpose *" placeholder="Describe the purpose of this event..." value={form.purpose} onChange={(e) => handleChange("purpose", e.target.value)} />
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader><CardTitle><MapPin size={20} style={{ color: "var(--brand)" }} />Venue Selection</CardTitle></CardHeader>
          <CardContent>
            {Object.entries(DEPARTMENT_VENUES).map(([dept, venues]) => (
              <div key={dept} className={styles.venueGroup}>
                <h3 className={styles.venueGroupTitle}>{dept} Department</h3>
                <div className={styles.venueButtons}>
                  {venues.map((venue) => {
                    const selected = form.selectedVenues.includes(venue);
                    return (
                      <button key={venue} onClick={() => toggleVenue(venue)} className={[styles.venueButton, selected ? styles.venueButtonSelected : styles.venueButtonDefault].join(" ")}>
                        {venue}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {form.selectedVenues.length > 0 && (
              <div className={styles.selectedVenues}>Selected: {form.selectedVenues.join(", ")}</div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader><CardTitle><Users size={20} style={{ color: "var(--brand)" }} />Additional Manpower</CardTitle></CardHeader>
          <CardContent>
            <div className={styles.grid2}>
              <Input label="Security Guards" type="number" min={0} value={form.security_guards} onChange={(e) => handleChange("security_guards", parseInt(e.target.value) || 0)} />
              <Input label="Service Crew" type="number" min={0} value={form.service_crew} onChange={(e) => handleChange("service_crew", parseInt(e.target.value) || 0)} />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader><CardTitle><FileText size={20} style={{ color: "var(--brand)" }} />Supporting Documents</CardTitle></CardHeader>
          <CardContent>
            <div className={styles.equipmentList}>
              {DOCUMENT_TYPES.map((type) => (
                <button key={type} onClick={() => addDocument(type)} disabled={form.documents.some((d) => d.type === type)} className={styles.equipmentButton}>
                  + {type}
                </button>
              ))}
            </div>
            {form.documents.map((doc) => (
              <div key={doc.type} className={styles.documentRow}>
                <Badge variant="info">{doc.type}</Badge>
                <div className={styles.documentInput}>
                  <input
                    type="file"
                    id={`file-${doc.type}`}
                    className={styles.fileInput}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) updateDocumentFile(doc.type, file);
                    }}
                  />
                  <label htmlFor={`file-${doc.type}`} className={styles.fileLabel}>
                    {doc.fileName || "Choose file..."}
                  </label>
                </div>
                {doc.existingUrl && !doc.file && (
                  <a href={doc.existingUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)", fontSize: "var(--text-sm)", whiteSpace: "nowrap" }}>
                    Current file
                  </a>
                )}
                <button onClick={() => removeDocument(doc.type)} className={styles.removeButton}>Remove</button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 5 && (
        <Card>
          <CardHeader><CardTitle><Package size={20} style={{ color: "var(--brand)" }} />Equipment Reservation</CardTitle></CardHeader>
          <CardContent>
            {showLedWallRestriction && (
              <div className={styles.warning}>
                <AlertTriangle size={20} />
                <span>LED Video Wall is only available when 2F Student Plaza is selected as venue.</span>
              </div>
            )}
            <div className={styles.equipmentList}>
              {EQUIPMENT_LIST.map((eq) => (
                <button key={eq} onClick={() => addEquipment(eq)} disabled={form.selectedEquipment.some((e) => e.name === eq)} className={styles.equipmentButton}>
                  + {eq}
                </button>
              ))}
            </div>
            {form.selectedEquipment.map((eq) => (
              <div key={eq.name} className={styles.equipmentCard}>
                <div className={styles.equipmentCardHeader}>
                  <Badge variant="default">{eq.name}</Badge>
                  <button onClick={() => removeEquipment(eq.name)} className={styles.removeButton}>Remove</button>
                </div>
                <div className={styles.grid2}>
                  <Input label="Quantity" type="number" min={1} value={eq.quantity} onChange={(e) => updateEquipment(eq.name, "quantity", parseInt(e.target.value) || 1)} />
                  <Input label="Notes" placeholder="Any special requirements..." value={eq.notes} onChange={(e) => updateEquipment(eq.name, "notes", e.target.value)} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 6 && (
        <Card>
          <CardHeader><CardTitle><Wrench size={20} style={{ color: "var(--brand)" }} />Setup Schedule</CardTitle></CardHeader>
          <CardContent>
            <div className={styles.grid2}>
              <Input label="Ingress Date & Time *" type="datetime-local" value={form.ingress_date} onChange={(e) => handleChange("ingress_date", e.target.value)} />
              <Input label="Egress Date & Time *" type="datetime-local" value={form.egress_date} onChange={(e) => handleChange("egress_date", e.target.value)} />
            </div>
            <Textarea label="Setup Instructions" placeholder="Describe any special setup requirements..." value={form.setup_instructions} onChange={(e) => handleChange("setup_instructions", e.target.value)} />
          </CardContent>
        </Card>
      )}

      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>Previous</Button>
        {step < 6 ? (
          <Button onClick={() => { if (validateStep()) setStep((s) => s + 1); }}>Next</Button>
        ) : (
          <Button onClick={handleSubmit} isLoading={loading}>{isEditMode ? "Update Reservation" : "Submit Reservation"}</Button>
        )}
      </div>
    </div>
  );
}
