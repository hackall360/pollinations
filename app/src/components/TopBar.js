import IconButton from "@material-ui/core/IconButton"
import React from "react"
import { NavLink, useLocation } from "react-router-dom"
import TemporaryDrawer from "./Drawer"

import styled from "@emotion/styled"
import { GlobalSidePadding, MOBILE_BREAKPOINT } from "../styles/global"

import { CloseOutlined } from "@material-ui/icons"
import MobileMenuIcon from '../assets/menuIcon.svg'
import Logo from './Logo'
import NavigationItems from "./organisms/NavigationItems"
import { SocialLinks } from './Social'


const TopBar = ({ navRoutes }) => {

  const drawerState = React.useState(false);
  const location = useLocation();

  
  return <OuterContainer>
    <TopContainer css={StyleUrl(location.pathname)}>
    <NavBarStyle>
      <NavigationItems navRoutes={navRoutes}/>
      
      <div style={{display: 'flex', }}>
        <NavLink to='/' style={{ 
            padding: 0, 
            paddingRight: 80,
            gridArea: 'logo', 
            display: 'flex',
             alignItems: 'center',
              marginLeft: '1em' }}>
          <Logo size='150px' small='150px' margin='0' />  
        </NavLink>

        <NavigationItems navRoutes={navRoutes}/>
      </div>

      <SocialLinks small hideOnMobile gap='1em'/>

      <MenuButton>
        <IconButton onClick={()=>drawerState[1](true)} >
          <img src={MobileMenuIcon}/>
        </IconButton>
      </MenuButton>

    </NavBarStyle>
    </TopContainer>

    <TemporaryDrawer drawerState={drawerState}>
      <MobileMenuStyle>
        <MobileCloseIconStyle>
          <IconButton onClick={()=>drawerState[1](false)}>
            <CloseOutlined />
          </IconButton>
        </MobileCloseIconStyle>

        <NavigationItems column navRoutes={navRoutes} margin='5em 0 0 0' gap='2em'/>
        <div >
          <CTAStyle>
              Let's talk 
              <br/>
              <span> hello@pollinations.ai </span>
          </CTAStyle>
          <SocialLinks small gap='1em' />
        </div>
      </MobileMenuStyle>
    </TemporaryDrawer>
  </OuterContainer>
};
const OuterContainer = styled.div`
width: 100%;
display: flex;
justify-content: center;
`



const MobileMenuStyle = styled.div`
position: relative;
width: 100%;
height: 100%;

display: flex;
flex-direction: column;
justify-content: space-evenly;
align-items: center;

padding: 20px 10px 60px;
`;
const MobileCloseIconStyle = styled.div`
position: absolute;
top: 20;
right: 20;
`;
const CTAStyle = styled.p`

font-style: normal;
font-weight: 500;
font-size: 18px;
line-height: 23px;
text-align: center;

color: #FFFFFF;
padding-bottom: 0em;

span {
    color: #E9FA29;
}
`
const TopContainer = styled.div`
  ${props => props.css};
  width: 100%;
padding: 0 30px;
  display: flex;
  justify-content: center;
`

const NavBarStyle = styled.div`
  width: 100%;
  max-width: 1440px;

  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto;
  grid-template-areas: "logo nav social";
  align-content: center;
  gap: 1em;

  font-size: 1rem;
  .MuiTypography-colorPrimary{
    color: #fdfdfd !important;  
  }
  padding: 1% 0;
  @media (max-width: ${MOBILE_BREAKPOINT}){
    grid-template-areas: "logo nav mobilebutton social";
  }
`
const MenuButton = styled.div`
grid-area: mobilebutton;
justify-self: flex-end;
@media (min-width: ${MOBILE_BREAKPOINT}){
  display: none;
}
`

const StyleUrl = (url) => {
  if (url?.slice(0,2) === '/c') return `position: relative;`;
  if (url?.slice(0,2) === '/p') return `position: relative;`;
  if (url?.slice(0,2) === '/n') return `position: relative;`;
  return ` 
    position: absolute;
    z-index: 1;`
};

export default TopBar
