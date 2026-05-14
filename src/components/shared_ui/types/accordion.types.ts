export type TAccordionItem = Array<{
    header: React.ReactNode;
    content: React.ReactNode;
}>;

export type TAccordionProps = {
    className?: string;
    list: TAccordionItem;
};
