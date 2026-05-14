import { ComponentProps } from 'react';

type TToggleButton = {
    onClick: ComponentProps<'button'>['onClick'];
};

const ToggleButton = ({ onClick }: TToggleButton) => (
    <button className='mobile-menu__toggle-button' onClick={onClick}>
        <div className='mobile-menu__hamburger'>
            <span></span>
            <span></span>
            <span></span>
        </div>
    </button>
);

export default ToggleButton;
