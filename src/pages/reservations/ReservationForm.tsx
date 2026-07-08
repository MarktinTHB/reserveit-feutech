import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  documents: { type: string; file: File | null; fileName: string }[];
}

export function ReservationForm() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormData>({
    activity_date: "", activity_name: "", purpose: "", department: "",
    event_duration: 1, internal_participants: 0, external_participants: 0,
    security_guards: 0, service_crew: 0, setup_instructions: "",
    ingress_date: "", egress_date: "", selectedVenues: [],
    selectedEquipment: [], documents: [],
  });

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
        if (new Date(form.activity_date) < new Date(new Date().toISOString().split("T")[0])) { showToast("Activity date cannot be in the past", "error"); return false; }
        return true;
      case 2:
        if (form.selectedVenues.length === 0) { showToast("Please select at least one venue", "warning"); return false; }
        return true;
      case 4:
        if (form.documents.length === 0) { showToast("Please upload at least one supporting document", "warning"); return false; }
        if (form.documents.some((d) => !d.file)) { showToast("Please select a file for each added document type", "warning"); return false; }
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

    const { data: resData, error: resError } = await supabase.from("reservations").insert({
      user_id: user.id, activity_date: form.activity_date, activity_name: form.activity_name,
      purpose: form.purpose, department: form.department, event_duration: form.event_duration,
      internal_participants: form.internal_participants, external_participants: form.external_participants,
      security_guards: form.security_guards, service_crew: form.service_crew,
      setup_instructions: form.setup_instructions, ingress_date: form.ingress_date || null,
      egress_date: form.egress_date || null, status: "pending",
    }).select().single();

    if (resError || !resData) { setLoading(false); showToast(resError?.message || "Failed to create reservation", "error"); return; }

    const reservationId = resData.id;

    for (const venueName of form.selectedVenues) {
      const { data: facilityData } = await supabase.from("facilities").select("id").eq("name", venueName).maybeSingle();
      await supabase.from("reservation_venues").insert({
        reservation_id: reservationId, facility_id: facilityData?.id || null,
        start_time: new Date(form.activity_date).toISOString(),
        end_time: new Date(new Date(form.activity_date).getTime() + form.event_duration * 3600000).toISOString(),
      });
    }

    for (const eq of form.selectedEquipment) {
      await supabase.from("reservation_equipment").insert({ reservation_id: reservationId, equipment_name: eq.name, quantity: eq.quantity, notes: eq.notes || null });
    }

    for (const doc of form.documents) {
      let fileUrl = "#";
      let fileSize: number | null = null;
      let fileType: string | null = null;

      if (doc.file) {
        const filePath = `${user.id}/${reservationId}/${doc.type.replace(/\s+/g, "_")}_${doc.file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("reservation-documents")
          .upload(filePath, doc.file, { upsert: true });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from("reservation-documents")
            .getPublicUrl(filePath);
          fileUrl = urlData?.publicUrl || "#";
        }
        fileSize = doc.file.size;
        fileType = doc.file.type;
      }

      await supabase.from("reservation_documents").insert({
        reservation_id: reservationId,
        document_type: doc.type,
        file_name: doc.fileName || doc.type,
        file_url: fileUrl,
        file_size: fileSize,
        file_type: fileType,
      });
    }

    setLoading(false);
    showToast("Reservation submitted successfully!", "success");
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

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>New Reservation</h1>
        <p className={styles.subtitle}>Complete all steps to submit your reservation request</p>
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
              <Input label="Activity Date *" type="date" value={form.activity_date} onChange={(e) => handleChange("activity_date", e.target.value)} min={new Date().toISOString().split("T")[0]} />
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
          <Button onClick={handleSubmit} isLoading={loading}>Submit Reservation</Button>
        )}
      </div>
    </div>
  );
}
