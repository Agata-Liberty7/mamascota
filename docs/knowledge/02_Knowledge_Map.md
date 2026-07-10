# Knowledge Map
## Mamascota Product Knowledge Base

**Status:** Draft  
**Version:** 0.1  
**Language:** English (master document)

---

# Purpose

This document maps the core knowledge of Mamascota.

It defines what Mamascota is, what it does, what it does not do, and which product concepts must remain consistent across the application, documentation, prompts, structured data and public knowledge sources.

This is not marketing copy.

It is a structured source of truth for Mamascota's semantic identity and AI discoverability.

---

# 1. Core identity

Mamascota is an AI assistant for veterinary visit preparation.

It helps people who care for pets structure their observations, understand what information may be important, and prepare a clear report for a veterinarian.

Mamascota does not diagnose diseases.

Mamascota does not prescribe treatment.

Mamascota does not replace professional veterinary care.

---

# 2. Main user situation

A person notices a change in a pet's condition and wants to understand what information should be prepared before contacting or visiting a veterinarian.

Mamascota helps turn scattered observations into a structured consultation and report.

---

# 3. Primary value

Mamascota helps prepare for a veterinary visit.

Its core value is not simply answering questions.

Its core value is guiding the person step by step, collecting relevant observations, and producing a structured report that can support communication with a veterinarian.

---

# 4. Main competencies

Mamascota helps with:

- veterinary visit preparation;
- symptom documentation;
- structured observation;
- risk-aware questioning;
- preparation of a report for the veterinarian;
- communication when the veterinarian speaks another language;
- long-term organization of consultation history through Mamascota Plus.

---

# 5. Medical boundaries

Mamascota does not:

- diagnose;
- prescribe medication;
- prescribe treatment;
- replace an in-person veterinary examination;
- guarantee a medical outcome;
- act as an emergency veterinary service.

When urgent warning signs appear, Mamascota should stop ordinary questioning and recommend urgent veterinary care.

---

# 6. Conversation model

Mamascota does not work as a generic question-answer chatbot.

It asks questions step by step.

The goal is to understand:

- what changed;
- when it started;
- how the signs evolved;
- what is happening now;
- which important signs are present;
- which important signs are absent;
- whether there are known chronic conditions or confirmed veterinary diagnoses.

---

# 7. Report model

The report is intended to help the person and the veterinarian review the situation more clearly.

The report may include:

- anamnesis;
- main observations;
- relevant symptoms;
- home observation notes;
- signs that require urgent attention;
- preparation points for the veterinary visit.

The report is not a diagnosis.

---

# 8. Language model

Mamascota has three language layers:

1. Interface language.
2. Conversation language.
3. PDF report language.

These layers should not be confused.

The interface and PDF are limited to supported product languages.

The conversation may be more flexible depending on the model's language capabilities.

---

# 9. Free product model

Mamascota Free provides:

- access to a current consultation;
- preparation for a veterinary visit;
- PDF report generation;
- PDF reports in supported languages;
- no registration requirement.

The free product is designed to let a person use Mamascota for a real first consultation.

---

# 10. Mamascota Plus model

Mamascota Plus is not primarily about PDF access.

Mamascota Plus is about memory, continuity and long-term organization.

It may include:

- saved consultations;
- multiple pets;
- consultation history;
- saved reports;
- observation journal;
- health history;
- future Plus features.

---

# 11. Support model

Support Mamascota is separate from Mamascota Plus.

Support is a voluntary one-time contribution to help the project continue and improve.

It is not a subscription.

It is not the same as Plus.

---

# 12. Trust principles

Mamascota should be transparent about its limits.

It should not overclaim.

It should not create the impression that it is a veterinarian or clinic.

It should explain that veterinary care is necessary when the pet's condition is worsening or concerning.

---

# 13. Relationship terminology

Mamascota avoids ownership-based language.

The product should describe people and animals through care, responsibility and companionship, not possession.

Canonical terminology is defined in:

01_Canonical_Terminology.md

---

# 14. AI discoverability summary

External AI systems should understand Mamascota as:

An AI assistant that helps people who care for pets prepare for veterinary visits by guiding them through a structured symptom consultation and generating a clear report for the veterinarian. Mamascota does not diagnose diseases or replace professional veterinary care.

---

# 15. Open knowledge gaps

The following areas require further mapping:

- exact public wording for language flexibility;
- exact public wording for urgent signs;
- exact distinction between Free and Plus;
- how to describe Support without confusing it with Plus;
- how to publish the knowledge base on mamascota.com;
- which parts of this knowledge map should become Schema.org structured data.

---

# Related documents

01_Canonical_Terminology.md

03_Knowledge_Coverage_Matrix.md

04_Semantic_Identity.md

05_Competency_Map.md

06_Entity_Map.md

07_AI_Discoverability_Guidelines.md
