import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Building2, Users, MapPin, CheckCircle, XCircle } from "lucide-react";
import type { Facility } from "@/types";
import styles from "./Facilities.module.css";

export function Facilities() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [filtered, setFiltered] = useState<Facility[]>([]);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFacilities();
  }, []);

  useEffect(() => {
    let result = facilities;
    if (search) {
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(search.toLowerCase()) ||
          f.description?.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (deptFilter) {
      result = result.filter((f) => f.department === deptFilter);
    }
    setFiltered(result);
  }, [search, deptFilter, facilities]);

  const fetchFacilities = async () => {
    setLoading(true);
    const { data } = await supabase.from("facilities").select("*").order("name");
    if (data) {
      setFacilities(data as Facility[]);
      setFiltered(data as Facility[]);
    }
    setLoading(false);
  };

  const departments = Array.from(new Set(facilities.map((f) => f.department)));

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Facilities</h1>
          <p className={styles.subtitle}>Browse and search available venues</p>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.search}>
          <Input
            placeholder="Search facilities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          options={[
            { value: "", label: "All Departments" },
            ...departments.map((d) => ({ value: d, label: d })),
          ]}
        />
      </div>

      {loading ? (
        <div className={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={[styles.skeletonCard, "skeleton"].join(" ")} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <Building2 size={48} className={styles.emptyIcon} />
          <p>No facilities found</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((facility) => (
            <div key={facility.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderRow}>
                  <h3 className={styles.cardTitle}>{facility.name}</h3>
                  <Badge variant={facility.is_active ? "success" : "error"}>
                    {facility.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className={styles.cardLocation}>
                  <MapPin size={16} />
                  {facility.location || "N/A"}
                </div>
              </div>
              <div className={styles.cardBody}>
                <p className={styles.cardDesc}>
                  {facility.description || "No description available."}
                </p>
                <div className={styles.badges}>
                  <Badge variant="info">{facility.department}</Badge>
                  <Badge variant="default">{facility.type}</Badge>
                </div>
                <div className={styles.cardFooter}>
                  <span className={styles.footerItem}>
                    <Users size={16} />
                    {facility.capacity || "N/A"}
                  </span>
                  <span className={styles.footerItem}>
                    {facility.requires_approval ? (
                      <CheckCircle size={16} style={{ color: "var(--color-warning-500)" }} />
                    ) : (
                      <XCircle size={16} style={{ color: "var(--color-success-500)" }} />
                    )}
                    {facility.requires_approval ? "Approval Required" : "No Approval"}
                  </span>
                </div>
                {facility.amenities && facility.amenities.length > 0 && (
                  <div className={styles.amenities}>
                    {facility.amenities.slice(0, 4).map((amenity) => (
                      <span key={amenity} className={styles.amenity}>{amenity}</span>
                    ))}
                    {facility.amenities.length > 4 && (
                      <span className={styles.amenity}>+{facility.amenities.length - 4}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
