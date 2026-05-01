

export type AccordianItem = {
  id: string
  name: string
  label: string
  onClick: () => void
  children: AccordianItem[]
}

export interface AccordianProps {
    options:AccordianItem[]
}