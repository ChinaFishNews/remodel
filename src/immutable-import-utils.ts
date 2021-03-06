/**
 * Copyright (c) 2016-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as Maybe from './maybe';
import * as ObjC from './objc';
import * as ObjCImportUtils from './objc-import-utils';
import * as ObjectGeneration from './object-generation';
import * as ObjectSpec from './object-spec';
import * as ObjectSpecCodeUtils from './object-spec-code-utils';

function isImportRequiredForTypeLookup(
  objectType: ObjectSpec.Type,
  typeLookup: ObjectGeneration.TypeLookup,
): boolean {
  return typeLookup.name !== objectType.typeName;
}

export function forwardClassDeclarationsForObjectType(
  objectType: ObjectSpec.Type,
): ObjC.ForwardDeclaration[] {
  return ([] as ObjC.ForwardDeclaration[]).concat(
    ...objectType.attributes.map(a =>
      ObjCImportUtils.forwardDeclarationsForAttributeType(
        a.type.name,
        a.type.underlyingType,
        a.type.conformingProtocol,
        a.type.referencedGenericTypes,
        objectType.typeLookups,
      ),
    ),
  );
}

export function importsForObjectType(
  objectType: ObjectSpec.Type,
): ObjC.Import[] {
  const baseImports: ObjC.Import[] = [
    {
      file: 'Foundation.h',
      isPublic: true,
      requiresCPlusPlus: false,
      library: 'Foundation',
    },
    {
      file: objectType.typeName + '.h',
      isPublic: false,
      requiresCPlusPlus: false,
      library: null,
    },
  ];
  const makePublicImports =
    objectType.includes.indexOf('UseForwardDeclarations') === -1;
  const skipAttributeImports =
    !makePublicImports &&
    objectType.includes.indexOf('SkipImportsInImplementation') !== -1;
  const typeLookupImports = objectType.typeLookups
    .filter(typeLookup => isImportRequiredForTypeLookup(objectType, typeLookup))
    .map(typeLookup =>
      ObjCImportUtils.importForTypeLookup(
        objectType.libraryName,
        makePublicImports || !typeLookup.canForwardDeclare,
        typeLookup,
      ),
    );
  const attributeImports = skipAttributeImports
    ? []
    : objectType.attributes
        .filter(attribute =>
          ObjCImportUtils.shouldIncludeImportForType(
            objectType.typeLookups,
            attribute.type.name,
          ),
        )
        .map(attribute =>
          ObjCImportUtils.importForAttribute(
            attribute.type.name,
            attribute.type.underlyingType,
            attribute.type.libraryTypeIsDefinedIn,
            attribute.type.fileTypeIsDefinedIn,
            objectType.libraryName,
            makePublicImports,
          ),
        );
  return baseImports.concat(typeLookupImports).concat(attributeImports);
}
