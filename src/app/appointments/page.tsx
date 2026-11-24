'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CalendarClock, Plus, Edit2, XCircle, AlertCircle } from 'lucide-react';
import { useStore } from '@/store';
import { Appointment } from '@/types';
import { formatDate, exportToCSV } from '@/lib/utils';
import { usePagination } from '@/lib/pagination';
import {
  PageHeader,
  FilterDropdown,
  StatusBadge,
  ConfirmDialog,
  EmptyState,
  Metric,
  Modal,
} from '@/components/ui/SharedComponents';
import {
  DataTable,
  DataTableColumn,
  DataTablePagination,
  DataTableToolbar,
} from '@/components/ui/DataTable';
import { useToast } from '@/components/ui/ToastProvider';

const DOCTORS = [
  { name: 'Dr. Ananya Rao', department: 'General Medicine' },
  { name: 'Dr. Vikram Mehta', department: 'Pediatrics & Family Medicine' },
  { name: 'Dr. Priya Nair', department: 'Dermatology & Care' },
];

const TIME_SLOTS = [
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
  '03:30 PM',
  '04:00 PM',
  '04:30 PM',
  '05:00 PM',
];

const VISIT_TYPES: Appointment['visitType'][] = ['Consultation', 'Follow-up', 'Routine Checkup', 'Emergency'];

export default function AppointmentsPage() {
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const appointments = useStore((s) => s.appointments);
  const updateAppointment = useStore((s) => s.updateAppointment);
  const cancelAppointment = useStore((s) => s.cancelAppointment);

  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'upcoming'>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [modalState, setModalState] = useState<{ open: boolean; apt: Appointment | null }>(() => ({
    open: searchParams.get('action') === 'create',
    apt: null,
  }));
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = appointments.filter((a) => {
      const matchesSearch =
        !q || [a.appointmentId, a.patientName, a.doctorName, a.department].some((v) => v.toLowerCase().includes(q));
      const matchesDate =
        dateFilter === 'all' ||
        (dateFilter === 'today' && a.date === today) ||
        (dateFilter === 'upcoming' && a.date >= today);
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
      return matchesSearch && matchesDate && matchesStatus;
    });

    return list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'patient') cmp = a.patientName.localeCompare(b.patientName);
      else if (sortKey === 'doctor') cmp = a.doctorName.localeCompare(b.doctorName);
      else cmp = a.date.localeCompare(b.date) || a.time.localeCompare(b.time);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [appointments, search, dateFilter, statusFilter, today, sortKey, sortDir]);

  const pagination = usePagination(filtered, 10);

  const handleSortChange = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'date' ? 'desc' : 'asc');
    }
    pagination.resetPage();
  };

  const stats = useMemo(() => {
    return {
      total: appointments.length,
      todayCount: appointments.filter((a) => a.date === today && a.status !== 'cancelled').length,
      waiting: appointments.filter((a) => a.status === 'waiting').length,
      completed: appointments.filter((a) => a.status === 'completed').length,
    };
  }, [appointments, today]);

  const changeStatus = (id: string, status: Appointment['status']) => {
    const res = updateAppointment(id, { status });
    if (res.success) addToast('success', 'Status updated', `Appointment marked as ${status}.`);
    else addToast('error', 'Update failed', res.error);
  };

  const handleCancel = () => {
    if (!cancellingId) return;
    const res = cancelAppointment(cancellingId);
    if (res.success) addToast('info', 'Appointment cancelled');
    setCancellingId(null);
  };

  const resetFilters = () => {
    setSearch('');
    setDateFilter('all');
    setStatusFilter('all');
    pagination.resetPage();
  };

  const handleExport = () => {
    if (filtered.length === 0) return;
    exportToCSV(
      filtered.map((a) => ({
        Appointment: a.appointmentId,
        Date: a.date,
        Time: a.time,
        Patient: a.patientName,
        Doctor: a.doctorName,
        Department: a.department,
        'Visit Type': a.visitType,
        Status: a.status,
        Notes: a.notes ?? '',
      })),
      `drstock-appointments-${new Date().toISOString().slice(0, 10)}`
    );
    addToast('success', 'Export complete', `${filtered.length} appointments exported to CSV.`);
  };

  const activeFilterCount = (dateFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

  const columns: DataTableColumn<Appointment>[] = [
    {
      key: 'date',
      header: 'ID & Slot',
      sortValue: (a) => `${a.date} ${a.time}`,
      render: (a) => (
        <div className="whitespace-nowrap">
          <span className="font-mono text-xs font-semibold text-foreground">{a.appointmentId}</span>
          <p className="text-xs text-muted mt-0.5">
            {formatDate(a.date)} · <span className="font-medium text-secondary-text">{a.time}</span>
          </p>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Patient',
      sortValue: (a) => a.patientName,
      render: (a) => <span className="font-semibold text-foreground">{a.patientName}</span>,
    },
    {
      key: 'doctor',
      header: 'Doctor & Dept',
      sortValue: (a) => a.doctorName,
      hideOnMobile: true,
      render: (a) => (
        <div>
          <p className="font-medium text-secondary-text">{a.doctorName}</p>
          <p className="text-xs text-muted">{a.department}</p>
        </div>
      ),
    },
    {
      key: 'visitType',
      header: 'Visit Type',
      hideOnMobile: true,
      render: (a) => (
        <span className="inline-flex px-2 py-0.5 rounded-md bg-muted-surface border border-border text-xs font-medium text-secondary-text">
          {a.visitType}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (a) =>
        a.status !== 'cancelled' ? (
          <select
            aria-label={`Status for ${a.appointmentId}`}
            value={a.status}
            onChange={(e) => changeStatus(a.id, e.target.value as Appointment['status'])}
            className="h-8 px-2 text-xs font-semibold rounded-md border border-border bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-focus cursor-pointer"
          >
            <option value="scheduled">Scheduled</option>
            <option value="waiting">Waiting</option>
            <option value="completed">Completed</option>
          </select>
        ) : (
          <StatusBadge status={a.status} variant="dot" />
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (a) => (
        <div className="inline-flex items-center gap-1 whitespace-nowrap">
          <button
            onClick={() => setModalState({ open: true, apt: a })}
            aria-label={`Reschedule ${a.appointmentId}`}
            title="Reschedule"
            className="p-1.5 text-muted hover:text-primary hover:bg-primary-subtle rounded-md transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {a.status !== 'cancelled' && a.status !== 'completed' && (
            <button
              onClick={() => setCancellingId(a.id)}
              aria-label={`Cancel ${a.appointmentId}`}
              title="Cancel appointment"
              className="p-1.5 text-muted hover:text-danger hover:bg-danger-bg rounded-md transition-colors"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clinic Appointments"
        description="Lightweight daily consultation schedule with automatic doctor slot conflict protection."
        action={
          <button
            onClick={() => setModalState({ open: true, apt: null })}
            className="inline-flex items-center gap-2 h-9 px-4 bg-primary text-primary-foreground text-[13px] font-medium rounded-lg hover:bg-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" /> Book Appointment
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Metric label="Total Bookings" value={String(stats.total)} hint="All scheduled visits" />
        <Metric label="Today's Schedule" value={String(stats.todayCount)} hint={formatDate(today)} accent="text-primary" />
        <Metric label="In Waiting Queue" value={String(stats.waiting)} hint="Currently at clinic" accent="text-warning" />
        <Metric label="Completed" value={String(stats.completed)} hint="Consultations finished" />
      </div>

      <div className="bg-surface rounded-xl border border-border">
        <DataTableToolbar
          search={search}
          onSearchChange={(val) => {
            setSearch(val);
            pagination.resetPage();
          }}
          searchPlaceholder="Search ID, patient, doctor…"
          activeFilterCount={activeFilterCount}
          onResetFilters={resetFilters}
          onExport={handleExport}
          exportDisabled={filtered.length === 0}
          filters={
            <>
              <FilterDropdown
                value={dateFilter}
                onChange={(v) => {
                  setDateFilter(v as 'all' | 'today' | 'upcoming');
                  pagination.resetPage();
                }}
                options={[
                  { value: 'all', label: 'All dates' },
                  { value: 'today', label: 'Today only' },
                  { value: 'upcoming', label: 'Upcoming & today' },
                ]}
              />
              <FilterDropdown
                value={statusFilter}
                onChange={(v) => {
                  setStatusFilter(v);
                  pagination.resetPage();
                }}
                options={[
                  { value: 'all', label: 'All statuses' },
                  { value: 'scheduled', label: 'Scheduled' },
                  { value: 'waiting', label: 'Waiting' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
              />
            </>
          }
        />

        <DataTable
          columns={columns}
          data={pagination.items}
          keyExtractor={(a) => a.id}
          sortKey={sortKey}
          sortDir={sortDir}
          onSortChange={handleSortChange}
          emptyState={
            <EmptyState
              icon={CalendarClock}
              title="No appointments found"
              description="No scheduled appointments match your current filter criteria."
              action={
                (search || activeFilterCount > 0) && (
                  <button
                    onClick={resetFilters}
                    className="h-9 px-4 text-[13px] font-medium text-primary bg-primary-subtle rounded-lg hover:bg-primary/15"
                  >
                    Reset Filters
                  </button>
                )
              }
            />
          }
          renderMobileCard={(a) => (
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{a.patientName}</p>
                  <p className="text-xs text-muted mt-0.5">
                    <span className="font-mono text-secondary-text">{a.appointmentId}</span> · {formatDate(a.date)} · {a.time}
                  </p>
                  <p className="text-xs text-muted mt-0.5 truncate">
                    {a.doctorName} · {a.visitType}
                  </p>
                </div>
                <StatusBadge status={a.status} variant="dot" />
              </div>

              <div className="flex items-center gap-2">
                {a.status !== 'cancelled' && (
                  <select
                    aria-label={`Status for ${a.appointmentId}`}
                    value={a.status}
                    onChange={(e) => changeStatus(a.id, e.target.value as Appointment['status'])}
                    className="flex-1 h-9 px-2.5 text-xs font-medium rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-focus"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="waiting">Waiting</option>
                    <option value="completed">Completed</option>
                  </select>
                )}
                <button
                  onClick={() => setModalState({ open: true, apt: a })}
                  className="h-9 px-3 text-xs font-medium text-secondary-text border border-border rounded-lg hover:bg-hover-surface"
                >
                  Reschedule
                </button>
                {a.status !== 'cancelled' && a.status !== 'completed' && (
                  <button
                    onClick={() => setCancellingId(a.id)}
                    className="h-9 px-3 text-xs font-medium text-danger border border-danger/25 rounded-lg hover:bg-danger-bg"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        />

        <DataTablePagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          totalPages={pagination.totalPages}
          startIndex={pagination.startIndex}
          endIndex={pagination.endIndex}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
          itemLabel="appointments"
        />
      </div>

      <AppointmentFormModal
        open={modalState.open}
        appointment={modalState.apt}
        initialPatientId={searchParams.get('patient') ?? undefined}
        onClose={() => setModalState({ open: false, apt: null })}
      />

      <ConfirmDialog
        open={cancellingId !== null}
        onClose={() => setCancellingId(null)}
        onConfirm={handleCancel}
        title="Cancel appointment?"
        description="The appointment slot will be freed for other patients."
        confirmLabel="Cancel Appointment"
        variant="danger"
      />
    </div>
  );
}

function AppointmentFormModal({
  open,
  appointment,
  initialPatientId,
  onClose,
}: {
  open: boolean;
  appointment: Appointment | null;
  initialPatientId?: string;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={appointment ? `Reschedule ${appointment.appointmentId}` : 'Book Appointment'} size="md">
      {open && (
        <AppointmentForm
          key={appointment?.id ?? 'new'}
          appointment={appointment}
          initialPatientId={initialPatientId}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

function AppointmentForm({
  appointment,
  initialPatientId,
  onClose,
}: {
  appointment: Appointment | null;
  initialPatientId?: string;
  onClose: () => void;
}) {
  const { addToast } = useToast();
  const customers = useStore((s) => s.customers);
  const addAppointment = useStore((s) => s.addAppointment);
  const updateAppointment = useStore((s) => s.updateAppointment);

  const [patientId, setPatientId] = useState(
    appointment?.patientId || (customers.some((c) => c.id === initialPatientId) ? initialPatientId! : customers[0]?.id ?? '')
  );
  const [doctorName, setDoctorName] = useState(appointment?.doctorName || DOCTORS[0].name);
  const [date, setDate] = useState(appointment?.date || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(appointment?.time || '10:30 AM');
  const [visitType, setVisitType] = useState<Appointment['visitType']>(appointment?.visitType || 'Consultation');
  const [notes, setNotes] = useState(appointment?.notes || '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const doc = DOCTORS.find((d) => d.name === doctorName) || DOCTORS[0];
    const patient = customers.find((c) => c.id === patientId);
    if (!patient) return setError('Select a valid patient.');

    if (appointment) {
      const res = updateAppointment(appointment.id, {
        patientId,
        patientName: patient.name,
        doctorName: doc.name,
        department: doc.department,
        date,
        time,
        visitType,
        notes,
      });
      if (!res.success) return setError(res.error);
      addToast('success', 'Appointment updated', `${appointment.appointmentId} saved.`);
    } else {
      const res = addAppointment({
        patientId,
        patientName: patient.name,
        doctorName: doc.name,
        department: doc.department,
        date,
        time,
        visitType,
        status: 'scheduled',
        notes,
      });
      if (!res.success) return setError(res.error);
      addToast('success', 'Appointment booked', `${patient.name} with ${doc.name} at ${time}.`);
    }
    onClose();
  };

  const field =
    'w-full h-9 px-3 text-[13px] bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 p-3 text-[13px] text-danger bg-danger-bg border border-danger/20 rounded-lg">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      <div>
        <label htmlFor="apt-patient" className="block text-[13px] font-medium text-secondary-text mb-1">
          Patient *
        </label>
        <select id="apt-patient" value={patientId} onChange={(e) => setPatientId(e.target.value)} className={field}>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.phone})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="apt-doc" className="block text-[13px] font-medium text-secondary-text mb-1">
          Consulting Doctor *
        </label>
        <select id="apt-doc" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} className={field}>
          {DOCTORS.map((d) => (
            <option key={d.name} value={d.name}>
              {d.name} — {d.department}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="apt-date" className="block text-[13px] font-medium text-secondary-text mb-1">
            Date *
          </label>
          <input id="apt-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="apt-time" className="block text-[13px] font-medium text-secondary-text mb-1">
            Time Slot *
          </label>
          <select id="apt-time" value={time} onChange={(e) => setTime(e.target.value)} className={field}>
            {TIME_SLOTS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="apt-visit" className="block text-[13px] font-medium text-secondary-text mb-1">
          Visit Type
        </label>
        <select
          id="apt-visit"
          value={visitType}
          onChange={(e) => setVisitType(e.target.value as Appointment['visitType'])}
          className={field}
        >
          {VISIT_TYPES.map((vt) => (
            <option key={vt} value={vt}>
              {vt}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="apt-notes" className="block text-[13px] font-medium text-secondary-text mb-1">
          Notes
        </label>
        <textarea
          id="apt-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Chief complaint or notes…"
          className="w-full px-3 py-2 text-[13px] bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent"
        />
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-3 border-t border-border">
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-4 text-[13px] font-medium text-secondary-text bg-surface border border-border rounded-lg hover:bg-hover-surface"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="h-9 px-5 text-[13px] font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary-hover"
        >
          {appointment ? 'Save Changes' : 'Confirm Booking'}
        </button>
      </div>
    </form>
  );
}
