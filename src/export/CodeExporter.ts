/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { Id64String } from "@bentley/bentleyjs-core";
import { Element, IModelDb, IModelExporter, IModelExportHandler, IModelJsFs } from "@bentley/imodeljs-backend";
import { CodeSpec, IModel } from "@bentley/imodeljs-common";

/** CodeExporter creates a CSV output file containing all Codes from the specified iModel. */
export class CodeExporter extends IModelExportHandler {
  public outputFileName: string;
  public iModelExporter: IModelExporter;

  /** Construct a new CodeExporter */
  public constructor(sourceDb: IModelDb, outputFileName: string) {
    super();
    if (IModelJsFs.existsSync(outputFileName)) {
      IModelJsFs.removeSync(outputFileName);
    }
    this.outputFileName = outputFileName;
    this.iModelExporter = new IModelExporter(sourceDb);
    this.iModelExporter.registerHandler(this);
    this.iModelExporter.wantGeometry = false;
    this.writeFileHeader();
  }

  /** Initiate the export of codes. */
  public static exportCodes(iModelDb: IModelDb, outputFileName: string): void {
    const handler = new CodeExporter(iModelDb, outputFileName);
    handler.iModelExporter.exportAll();
  }

  /** Override of IModelExportHandler.onExportElement that outputs a line of a CSV file when the Element has a Code. */
  protected onExportElement(element: Element, isUpdate: boolean | undefined): void {
    const codeValue: string = element.code.getValue();
    if ("" !== codeValue) { // only output when Element has a Code
      const codeSpec: CodeSpec = element.iModel.codeSpecs.getById(element.code.spec);
      const codeScopePath: string = this.buildCodeScopePath(element);
      this.writeLine(element.id, codeSpec.name, codeScopePath, codeValue);
    }
    super.onExportElement(element, isUpdate); // call super to continue export
  }

  /** Recursively build CodeScope path until the root Subject is reached. */
  private buildCodeScopePath(element: Element): string {
    if (element.id === IModel.rootSubjectId) {
      return ""; // special case that the root Subject is scoped to itself
    }
    const scopeElement: Element = element.iModel.elements.getElement(element.code.scope);
    if (scopeElement.id === IModel.rootSubjectId) {
      return "/";
    }
    const codeScopePart: string = scopeElement.code.value ?? scopeElement.userLabel ?? scopeElement.id;
    return `${this.buildCodeScopePath(scopeElement)}${codeScopePart}/`;
  }

  /** Write header line into CSV file. */
  private writeFileHeader(): void {
    this.writeLine("ElementId", "CodeSpecName", "CodeScopePath", "CodeValue");
  }

  /** Write a line into the CSV file. */
  private writeLine(elementId: Id64String, codeSpecName: string, codeScopePath: string, codeValue: string): void {
    IModelJsFs.appendFileSync(this.outputFileName, `${elementId}, ${codeSpecName}, ${codeScopePath}, ${codeValue}\n`);
  }
}
