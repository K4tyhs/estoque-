import React from 'react';

export default function FarmarcasLogo({ width = 160, className = "" }) {
  return (
    <img
      src="https://media.licdn.com/dms/image/v2/C560BAQFeh6yMTVCZbQ/company-logo_200_200/company-logo_200_200/0/1630658910789/farmarcas_logo?e=2147483647&v=beta&t=b_8zLrB-5OQx3IhPG5mitIUJkfKu9jydgm4cNO1SnLA"
      alt="Farmarcas Logo"
      style={{ width: width, height: 'auto', borderRadius: 8, objectFit: 'contain' }}
      className={className}
    />
  );
}
