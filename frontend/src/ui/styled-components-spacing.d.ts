declare module "styled-components-spacing" {
    type DefaultSpacingBreakpoints = 'mobile' | 'tablet' | 'desktop'
    type SpacingLength<Breakpoints extends string> = number | { [Breakpoint in Breakpoints]: number }

    interface SpacingOptions<Breakpoints extends string = DefaultSpacingBreakpoints> {
        horizontal: SpacingLength<Breakpoints>
        vertical: SpacingLength<Breakpoints>
        top: SpacingLength<Breakpoints>
        bottom: SpacingLength<Breakpoints>
        left: SpacingLength<Breakpoints>
        right: SpacingLength<Breakpoints>
    }

    declare function Margin(props: { children: React.ReactNode } & Partial<SpacingOptions>)
}
